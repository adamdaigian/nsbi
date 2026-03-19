import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import path from "path";
import { initDuckDB, reRegisterTable } from "@/engine/duckdb";
import { createApiRouter } from "./api-middleware";
import { startFileWatcher } from "./file-watcher";
import type { NsbiConfig } from "@/config/schema";

export interface DevServerOptions {
  port: number;
  dir: string; // project directory containing pages/ and data/
  config: NsbiConfig;
}

export async function startDevServer({ port, dir, config }: DevServerOptions) {
  const projectDir = path.resolve(dir);
  const dataDir = path.join(projectDir, config.data.dir);
  const pagesDir = path.join(projectDir, "pages");

  // 1. Initialize DuckDB with data files
  console.log(`[nsbi] Loading data from ${dataDir}`);
  await initDuckDB(dataDir);

  // 2. Create Express app
  const app = express();
  app.use(express.json());

  // 3. Mount API routes
  app.use(createApiRouter(pagesDir));

  // 4. Create Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: path.resolve(import.meta.dirname, "../.."),
  });

  // 5. Use Vite's middleware for everything else (SPA + HMR)
  app.use(vite.middlewares);

  // 6. Create HTTP server (needed for WebSocket upgrade)
  const httpServer = createHttpServer(app);

  // 7. Start file watcher with WebSocket for HMR
  startFileWatcher({ httpServer, pagesDir, dataDir });

  // 8. Start listening
  httpServer.listen(port, () => {
    console.log(`\n  [nsbi] Dev server running at http://localhost:${port}\n`);
  });
}
