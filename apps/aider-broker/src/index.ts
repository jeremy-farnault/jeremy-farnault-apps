import { loadConfig } from "./config";
import { createBrokerServer } from "./server";

const config = loadConfig();
const server = createBrokerServer(config);

server.listen(config.port, "127.0.0.1", () => {
  console.log(`aider-broker listening on 127.0.0.1:${config.port}`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
