import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import path from "path";
import fs from "fs";
import { initDuckDB, reRegisterTable } from "@/engine/duckdb";
import { createApiRouter } from "./api-middleware";
import { startFileWatcher } from "./file-watcher";
import { loadSemanticModel } from "@/semantic/loader";
import type { SemanticModel } from "@/semantic/types";
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
  const modelsDir = path.join(projectDir, config.models.dir);

  // 1. Initialize DuckDB with data files
  console.log(`[nsbi] Loading data from ${dataDir}`);
  await initDuckDB(dataDir);

  // 2. Load semantic model if models/ exists
  let semanticModel: SemanticModel | null = null;
  if (fs.existsSync(modelsDir)) {
    semanticModel = loadSemanticModel(modelsDir);
  }

  // 3. Create Express app
  const app = express();
  app.use(express.json());

  // 4. Mount API routes (pass semantic model and AI config)
  app.use(createApiRouter(pagesDir, { semanticModel, aiConfig: config.ai }));

  // 5. Create Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: path.resolve(import.meta.dirname, "../.."),
  });

  // 6. Use Vite's middleware for everything else (SPA + HMR)
  app.use(vite.middlewares);

  // 7. Create HTTP server (needed for WebSocket upgrade)
  const httpServer = createHttpServer(app);

  // 8. Start file watcher with WebSocket for HMR
  startFileWatcher({
    httpServer,
    pagesDir,
    dataDir,
    modelsDir: fs.existsSync(modelsDir) ? modelsDir : undefined,
    onModelsChange: () => {
      console.log("[nsbi] Reloading semantic model...");
      semanticModel = loadSemanticModel(modelsDir);
    },
  });

  // 9. Start listening
  httpServer.listen(port, () => {
    console.log(`\n  [nsbi] Dev server running at http://localhost:${port}\n`);
  });
}
