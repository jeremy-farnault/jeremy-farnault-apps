import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { checkBearer, getTrustedUserId } from "./auth";
import type { BrokerConfig } from "./config";
import { requestOllamaToolDecision, streamOllamaChat } from "./ollama";
import { withPersona } from "./persona";
import { AVAILABLE_TOOLS, TOOL_REGISTRY } from "./tools";
import type { BrokerStreamEvent, ChatMessage, ChatRequestBody } from "./types";

const MAX_BODY_BYTES = 64 * 1024;

// How often to emit a blank-line keepalive while waiting for the model's first
// token, so no downstream hop times out during a cold model load.
const HEARTBEAT_MS = 10_000;

export function createBrokerServer(config: BrokerConfig): Server {
  return createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      handleHealth(req, res, config);
      return;
    }
    if (req.method === "POST" && req.url === "/v1/chat") {
      void handleChat(req, res, config);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

function handleHealth(req: IncomingMessage, res: ServerResponse, config: BrokerConfig): void {
  if (!checkBearer(req, config.sharedSecret)) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "aider-broker", models: config.models }));
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const role = (value as { role?: unknown }).role;
  const content = (value as { content?: unknown }).content;
  return (
    (role === "user" || role === "assistant" || role === "system" || role === "tool") &&
    typeof content === "string"
  );
}

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const model = (value as { model?: unknown }).model;
  const messages = (value as { messages?: unknown }).messages;
  return (
    typeof model === "string" &&
    model.length > 0 &&
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(isChatMessage)
  );
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("PAYLOAD_TOO_LARGE"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function writeEvent(res: ServerResponse, event: BrokerStreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function resolveMessagesForFinalAnswer(
  config: BrokerConfig,
  model: string,
  userId: string,
  personaMessages: ChatMessage[],
  signal: AbortSignal
): Promise<{
  messages: ChatMessage[];
  toolUsed: string | null;
  toolArguments: string | null;
}> {
  try {
    const decision = await requestOllamaToolDecision(
      config.ollamaUrl,
      model,
      personaMessages,
      AVAILABLE_TOOLS,
      signal
    );

    // Diagnostic: how many tool calls the model emitted and their names, so we
    // can tell "model chose no tool" from "tool-decision request errored".
    console.log(
      JSON.stringify({
        toolDecision: {
          offered: AVAILABLE_TOOLS.length,
          returned: decision.toolCalls.map((call) => call.function.name),
        },
      })
    );

    const toolCall = decision.toolCalls[0];
    const tool = toolCall ? TOOL_REGISTRY.get(toolCall.function.name) : undefined;
    if (toolCall && tool) {
      const toolResultContent = await tool.execute(userId, toolCall.function.arguments);
      return {
        messages: [
          ...personaMessages,
          { role: "assistant", content: "", tool_calls: [toolCall] },
          { role: "tool", content: toolResultContent },
        ],
        toolUsed: toolCall.function.name,
        toolArguments: stringifyToolArguments(toolCall.function.arguments),
      };
    }
  } catch (error) {
    // Tool-decision phase failed for any reason (Ollama error, e.g. the
    // model doesn't support tools, network error, unexpected shape) — fall
    // back to a normal answer rather than breaking the request. Log the reason
    // so a hard failure (e.g. Ollama rejecting the tools payload) is visible
    // instead of silently degrading every request to no-tool.
    console.log(
      JSON.stringify({
        toolDecisionError: error instanceof Error ? error.message : String(error),
      })
    );
  }

  return { messages: personaMessages, toolUsed: null, toolArguments: null };
}

// Generic (tool-agnostic) rendering of the model's raw arguments for the client
// `tool` event. Ollama may hand back arguments as an object or a JSON string.
function stringifyToolArguments(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return null;
  }
}

async function handleChat(
  req: IncomingMessage,
  res: ServerResponse,
  config: BrokerConfig
): Promise<void> {
  if (!checkBearer(req, config.sharedSecret)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const userId = getTrustedUserId(req);
  if (!userId) {
    sendJson(res, 400, { error: "Missing X-Aider-User-Id header" });
    return;
  }

  let raw: Buffer;
  try {
    raw = await readBody(req);
  } catch {
    sendJson(res, 413, { error: "Payload too large" });
    return;
  }

  let parsedBody: unknown;
  try {
    parsedBody = raw.length > 0 ? JSON.parse(raw.toString("utf8")) : null;
  } catch {
    parsedBody = null;
  }

  if (!isChatRequestBody(parsedBody)) {
    sendJson(res, 400, { error: "Body must be { model: string, messages: { role, content }[] }" });
    return;
  }

  const { model, messages } = parsedBody;
  const allowedModels = Object.values(config.models);
  if (!allowedModels.includes(model)) {
    sendJson(res, 400, { error: `Unsupported model. Allowed: ${allowedModels.join(", ")}` });
    return;
  }

  const controller = new AbortController();

  // Open the response and emit `meta` up front, before any (potentially slow,
  // cold-loading) Ollama call. This keeps time-to-first-byte near-instant so no
  // idle/TTFB timeout on Vercel or the tunnel fires while the Pi loads a model;
  // the whole slow phase now happens inside an already-live stream. A blank-line
  // heartbeat keeps bytes flowing until real content arrives (the client and the
  // Vercel proxy both skip empty NDJSON lines). Committing to a 200 means a later
  // failure is reported as an `error` event rather than an HTTP status — which the
  // client already handles.
  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store",
  });
  writeEvent(res, { type: "meta", model });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write("\n");
  }, HEARTBEAT_MS);
  const stopHeartbeat = () => clearInterval(heartbeat);
  res.on("close", () => {
    controller.abort();
    stopHeartbeat();
  });

  try {
    const personaMessages = withPersona(messages);
    const {
      messages: messagesForFinalAnswer,
      toolUsed,
      toolArguments,
    } = await resolveMessagesForFinalAnswer(
      config,
      model,
      userId,
      personaMessages,
      controller.signal
    );

    console.log(JSON.stringify({ userId, model, toolUsed }));

    if (toolUsed) {
      writeEvent(res, {
        type: "tool",
        name: toolUsed,
        ...(toolArguments ? { arguments: toolArguments } : {}),
      });
    }

    const iterator = streamOllamaChat(
      config.ollamaUrl,
      model,
      messagesForFinalAnswer,
      controller.signal
    );

    let result = await iterator.next();
    stopHeartbeat(); // real tokens are flowing now
    while (!result.done) {
      writeEvent(res, { type: "token", content: result.value });
      result = await iterator.next();
    }
    writeEvent(res, { type: "done" });
  } catch {
    writeEvent(res, { type: "error", message: "Model backend error" });
  } finally {
    stopHeartbeat();
    res.end();
  }
}
