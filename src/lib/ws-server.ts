import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { redisSub } from "./redis-pubsub";

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 5_000;

const clients = new Set<WebSocket>();

let wss: WebSocketServer | null = null;

/** Initialise and attach the WebSocket server to an existing HTTP server. */
export function initWsServer(server: HttpServer) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (pathname !== "/ws") {
      // Let Next.js (or other handlers) handle non-/ws upgrades (e.g. HMR)
      return;
    }
    wss!.handleUpgrade(req, socket, head, (ws) => {
      wss!.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // Keepalive ping / pong
  const pingTimer = setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState !== WebSocket.OPEN) {
        clients.delete(ws);
        continue;
      }
      let alive = false;
      const onPong = () => { alive = true; };
      ws.once("pong", onPong);
      ws.ping();
      setTimeout(() => {
        ws.removeListener("pong", onPong);
        if (!alive && ws.readyState === WebSocket.OPEN) {
          ws.terminate();
          clients.delete(ws);
        }
      }, PONG_TIMEOUT_MS);
    }
  }, PING_INTERVAL_MS);

  wss.on("close", () => clearInterval(pingTimer));

  // Subscribe to Redis channels and broadcast
  redisSub.subscribe("zimcast:epg", "zimcast:matches", (err) => {
    if (err) console.error("[WS] Redis subscribe error:", err.message);
    else console.log("[WS] subscribed to zimcast:epg, zimcast:matches");
  });

  redisSub.on("message", (_channel: string, message: string) => {
    broadcast(message);
  });

  console.log("[WS] server initialised");
}

/** Send a raw JSON string to every open client. */
export function broadcast(data: string) {
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/** Current connected client count (for diagnostics). */
export function clientCount(): number {
  return clients.size;
}
