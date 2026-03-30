/**
 * tests/helpers/server.ts
 *
 * Creates a real Next.js HTTP server for Supertest.
 *
 * Approach: import Next.js programmatically and create an http.Server
 * from it. This lets Supertest bind to a random port and make real HTTP
 * requests against all App Router API routes.
 */
import { createServer, IncomingMessage, ServerResponse } from "http";
import next from "next";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null;
let server: ReturnType<typeof createServer> | null = null;
export let serverUrl = "";

export async function startServer(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app = (next as any)({
    dev: false,
    dir: process.cwd(),
    quiet: true,
  });
  await app.prepare();

  const handle = app.getRequestHandler();

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    handle(req, res);
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, "127.0.0.1", () => {
      const addr = server!.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      serverUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

export async function stopServer(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server?.close((err) => (err ? reject(err) : resolve()));
  });
  await app?.close();
  server = null;
  app = null;
  serverUrl = "";
}
