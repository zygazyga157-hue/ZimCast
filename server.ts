import { createServer } from "http";
import next from "next";
import { initWsServer } from "./src/lib/ws-server";
import { startEpgScheduler } from "./src/lib/epg-scheduler";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Attach WebSocket upgrade handler
  initWsServer(server);

  // Start program-boundary scheduler
  startEpgScheduler();

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket on ws://${hostname}:${port}/ws`);
  });
});
