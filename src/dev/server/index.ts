// TODO: make a good homepage
import { createServer, type IncomingHttpHeaders } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { root } from "@/dev/server/templates";
import type { HMRServerConfig } from "@/config/schema";
import { DEFAULT_PORT, outDir } from "@/dev";
import { pc } from "@/utils/common";
import { createLogger } from "@/utils/logger";
import { extname, resolve, join } from "node:path";
import { createReadStream, existsSync, statSync } from "node:fs";

export const WS_PATH = "/spicetify-creator";

export type HMRServer = Awaited<ReturnType<typeof createHmrServer>>;

export async function createHmrServer(config: HMRServerConfig, logger = createLogger("hmrServer")) {
  const { port = DEFAULT_PORT, serveDir = outDir } = config;
  let isRunning = false;

  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  const httpServer = createServer((req, res) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE",
      "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const wrapResponse = (statusCode: number, headers: IncomingHttpHeaders) => {
      res.writeHead(statusCode, { ...headers, ...corsHeaders });
    };

    const url = req.url ?? "/";
    const cleanUrl = url.split("?")[0] ?? "/";

    if (cleanUrl === "/" || cleanUrl === "/index.html") {
      wrapResponse(200, { "Content-Type": "text/html" });
      res.end(root());
      return;
    }

    const relativePath = cleanUrl.startsWith("/files/")
      ? cleanUrl.slice("/files".length)
      : cleanUrl;

    const filePath = resolve(join(serveDir, relativePath));

    try {
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        wrapResponse(200, { "Content-Type": contentType });
        createReadStream(filePath).pipe(res);
        return;
      }
    } catch {}

    wrapResponse(404, { "Content-Type": "text/html" });
    res.end("<h1>404 - Not Found</h1>");
  });

  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  httpServer.on("upgrade", (req, socket, head) => {
    const { url } = req;
    if (!url?.startsWith(WS_PATH)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      clients.add(ws);

      ws.on("close", () => {
        clients.delete(ws);
      });

      ws.on("error", () => {
        clients.delete(ws);
      });

      wss.emit("connection", ws, req);
    });
  });

  function broadcast(data: string[]) {
    const message = typeof data === "string" ? data : JSON.stringify(data);

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  return {
    start: async () =>
      new Promise<void>((resolve) => {
        httpServer.listen(port, () => {
          logger.debug(
            `${pc.bold("HTTP Server Started at")}: ${pc.cyan(`http://localhost:${port}/`)}`,
          );
          isRunning = true;
          resolve();
        });
      }),

    stop: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err);
          isRunning = false;
          logger.debug(`${pc.yellow("! ")} ${pc.gray("HTTP server stopped")}`);
          resolve();
        });
      }),

    broadcast,

    get port() {
      return port;
    },
    get isRunning() {
      return isRunning;
    },
    get link() {
      return `http://localhost:${port}`;
    },
    get wsLink() {
      return `ws://localhost:${port}${WS_PATH}`;
    },
  };
}
