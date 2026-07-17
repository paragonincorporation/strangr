import { parseServerConfig } from "@paramingle/config";
import { createApp } from "./app.js";

let config;

try {
  config = parseServerConfig(process.env);
} catch (error) {
  console.error("Configuration error:");
  console.error(error);

  if (error instanceof Error) {
    console.error(error.stack);
  }

  process.exit(1);
}

const app = createApp({ config });
const { API_PORT: port, API_HOST: host } = config;

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port, host });

  app.log.info(
    {
      webSocket: `ws://localhost:${port}/ws`,
      worker: "npm run start:worker",
    },
    "Paramingle API foundation ready",
  );
} catch (error) {
  console.error("Failed to start server:");
  console.error(error);

  if (error instanceof Error) {
    console.error(error.stack);
  }

  app.log.error(error);

  process.exit(1);
}
