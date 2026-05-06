import { createServer } from "node:http";
import next from "next";
import { attachRealtimeServer } from "@/lib/realtime-server";
import { logger } from "@/lib/logger";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((request, response) => {
    handle(request, response);
  });

  attachRealtimeServer(httpServer);

  httpServer.listen(port, hostname, () => {
    logger.info("server.ready", {
      url: `http://${hostname}:${port}`,
      dev,
    });
  });
});
