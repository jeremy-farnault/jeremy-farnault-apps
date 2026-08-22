export interface BrokerConfig {
  port: number;
  sharedSecret: string;
  ollamaUrl: string;
  models: {
    curiosity: string;
    data: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BrokerConfig {
  const sharedSecret = env.AIDER_PI_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error("AIDER_PI_SHARED_SECRET is required");
  }

  return {
    port: Number(env.PI_PORT ?? 8787),
    sharedSecret,
    ollamaUrl: env.OLLAMA_URL ?? "http://localhost:11434",
    models: {
      curiosity: env.MODEL_CURIOSITY ?? "qwen2.5:3b-instruct",
      data: env.MODEL_DATA ?? "llama3.1:8b",
    },
  };
}
