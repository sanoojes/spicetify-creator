// TODO: make a good homepage
import { createServer, request, type IncomingHttpHeaders } from "node:http";
import { root } from "@/dev/server/templates";
import type { BuildContext } from "esbuild";
import type { HMRServerConfig } from "@/config/schema";
import { DEFAULT_PORT, outDir } from "@/dev";
import { pc } from "@/utils/common";
import { createLogger } from "@/utils/logger";
import { extname, resolve } from "node:path";
import { createReadStream, existsSync } from "node:fs";

export const HMR_PATH = "/sc-live";
export type HmrEvent =
  | { type: "connected"; data: { id: string } }
  | { type: "update"; data: { files: string[]; timestamp: number } }
  | { type: "css-update"; data: { files: string[]; timestamp: number } }
  | { type: "error"; data: { message: string } };

export type HMRServer = Awaited<ReturnType<typeof createHmrServer>>;

export async function createHmrServer(
  config: HMRServerConfig,
  initialCtx?: BuildContext,
  logger = createLogger("hmrServer"),
) {
  const { port = DEFAULT_PORT, serveDir } = config;
  let isRunning = false;

  let ctx = initialCtx;
  let esbuildServe: Awaited<ReturnType<BuildContext["serve"]>> | undefined;
  const initEsbuildServe = async () => {
    if (ctx && !esbuildServe) {
      esbuildServe = await ctx.serve({
        servedir: serveDir,
      });
    }
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

    if (!esbuildServe) {
      wrapResponse(500, { "Content-Type": "text/plain" });
      res.end("Not working");
      return;
    }

    const url = req.url || "/";

    const buildDirPrefix = "/files/";
    if (url.startsWith(buildDirPrefix)) {
      const relativePath = url.replace(buildDirPrefix, "");
      const filePath = resolve(outDir, relativePath);

      if (existsSync(filePath)) {
        const mimeTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".gif": "image/gif",
          ".svg": "image/svg+xml",
        };

        const ext = extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        res.writeHead(200, { ...corsHeaders, "Content-Type": contentType });
        createReadStream(filePath).pipe(res);
        return;
      }
    }

    if (url === "/" || url === "/index.html") {
      wrapResponse(200, { "Content-Type": "text/html" });
      res.end(root());
      return;
    }

    let proxyPath = url;
    if (url.startsWith(HMR_PATH)) proxyPath = "/esbuild";

    const options = {
      hostname: esbuildServe.hosts[0],
      port: esbuildServe.port,
      path: proxyPath,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = request(options, (proxyRes) => {
      if (proxyRes.statusCode === 404) {
        wrapResponse(404, { "Content-Type": "text/html" });
        res.end("<h1>A custom 404 page</h1>");
        return;
      }

      wrapResponse(proxyRes.statusCode ?? 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on("error", () => {
      wrapResponse(502, { "Content-Type": "text/plain" });
      res.end("Proxy Error");
    });

    req.pipe(proxyReq, { end: true });
  });
  return {
    setContext: (newCtx: BuildContext) => {
      ctx = newCtx;
      esbuildServe = undefined;
    },
    start: async () => {
      if (ctx) await initEsbuildServe();

      return new Promise<void>((resolve) => {
        httpServer.listen(port, () => {
          logger.debug(
            `${pc.bold("HTTP Server Started at")}: ${pc.cyan(`http://localhost:${port}/`)}`,
          );

          isRunning = true;
          resolve();
        });
      });
    },

    stop: () => {
      return new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err);
          isRunning = false;
          logger.debug(`${pc.yellow("! ")} ${pc.gray("HTTP server stopped")}`);
          resolve();
        });
      });
    },

    get port() {
      return port;
    },
    get isRunning() {
      return isRunning;
    },
    get link() {
      return `http://localhost:${port}`;
    },
    get hmrLink() {
      return `${this.link}${HMR_PATH}`;
    },
  };
}
