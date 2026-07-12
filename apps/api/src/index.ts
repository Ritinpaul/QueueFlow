import "./env.js";
import { buildServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const server = await buildServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🚀 API server listening on http://${HOST}:${PORT}`);
    server.log.info(`📖 Swagger docs at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}. Shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
