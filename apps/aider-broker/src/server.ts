import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { checkBearer, getTrustedUserId } from "./auth";
import type { BrokerConfig } from "./config";
import { requestOllamaToolDecision, streamOllamaChat } from "./ollama";
import { withPersona } from "./persona";
import { AVAILABLE_TOOLS, GET_WORKOUTS_TOOL_NAME, executeGetWorkoutsInRange } from "./tools";
import type { BrokerStreamEvent, ChatMessage, ChatRequestBody } from "./types";

const MAX_BODY_BYTES = 64 * 1024;

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
): Promise<{ messages: ChatMessage[]; toolUsed: string | null }> {
  try {
    const decision = await requestOllamaToolDecision(
      config.ollamaUrl,
      model,
      personaMessages,
      AVAILABLE_TOOLS,
      signal
    );

    const toolCall = decision.toolCalls[0];
    if (toolCall?.function.name === GET_WORKOUTS_TOOL_NAME) {
      const toolResultContent = await executeGetWorkoutsInRange(
        userId,
        toolCall.function.arguments
      );
      return {
        messages: [
          ...personaMessages,
          { role: "assistant", content: "", tool_calls: [toolCall] },
          { role: "tool", content: toolResultContent },
        ],
        toolUsed: toolCall.function.name,
      };
    }
  } catch {
    // Tool-decision phase failed for any reason (Ollama error, e.g. the
    // model doesn't support tools, network error, unexpected shape) — fall
    // back to a normal answer rather than breaking the request.
  }

  return { messages: personaMessages, toolUsed: null };
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
  res.on("close", () => controller.abort());

  const personaMessages = withPersona(messages);
  const { messages: messagesForFinalAnswer, toolUsed } = await resolveMessagesForFinalAnswer(
    config,
    model,
    userId,
    personaMessages,
    controller.signal
  );

  console.log(JSON.stringify({ userId, model, toolUsed }));

  const iterator = streamOllamaChat(
    config.ollamaUrl,
    model,
    messagesForFinalAnswer,
    controller.signal
  );

  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch {
    sendJson(res, 502, { error: "Model backend unreachable" });
    return;
  }

  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store",
  });
  writeEvent(res, { type: "meta", model });
  if (toolUsed) {
    writeEvent(res, { type: "tool", name: toolUsed });
  }

  try {
    let result = first;
    while (!result.done) {
      writeEvent(res, { type: "token", content: result.value });
      result = await iterator.next();
    }
    writeEvent(res, { type: "done" });
  } catch {
    writeEvent(res, { type: "error", message: "Model backend error" });
  } finally {
    res.end();
  }
}
