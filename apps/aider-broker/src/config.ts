export interface BrokerConfig {
  port: number;
  sharedSecret: string;
  ollamaUrl: string;
  databaseUrl: string;
  models: {
    fast: string;
    capable: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BrokerConfig {
  const sharedSecret = env.AIDER_PI_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error("AIDER_PI_SHARED_SECRET is required");
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    port: Number(env.PI_PORT ?? 8787),
    sharedSecret,
    ollamaUrl: env.OLLAMA_URL ?? "http://localhost:11434",
    databaseUrl,
    models: {
      fast: env.MODEL_FAST ?? "qwen2.5:3b-instruct",
      capable: env.MODEL_CAPABLE ?? "llama3.1:8b",
    },
  };
}
