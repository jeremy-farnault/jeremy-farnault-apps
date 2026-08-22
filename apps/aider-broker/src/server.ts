import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { checkBearer, getTrustedUserId } from "./auth";
import type { BrokerConfig } from "./config";
import { streamOllamaChat } from "./ollama";
import { classifyIntent } from "./routing";
import type { BrokerStreamEvent, ChatMessage } from "./types";

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
    (role === "user" || role === "assistant" || role === "system") && typeof content === "string"
  );
}

function isChatRequestBody(value: unknown): value is { messages: ChatMessage[] } {
  if (typeof value !== "object" || value === null) return false;
  const messages = (value as { messages?: unknown }).messages;
  return Array.isArray(messages) && messages.length > 0 && messages.every(isChatMessage);
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
    sendJson(res, 400, { error: "Body must be { messages: { role, content }[] }" });
    return;
  }

  const { messages } = parsedBody;
  const decision = classifyIntent(messages, config.models);

  console.log(JSON.stringify({ userId, route: decision.route, model: decision.model }));

  const controller = new AbortController();
  res.on("close", () => controller.abort());

  const iterator = streamOllamaChat(config.ollamaUrl, decision.model, messages, controller.signal);

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
  writeEvent(res, { type: "meta", route: decision.route, model: decision.model });

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
