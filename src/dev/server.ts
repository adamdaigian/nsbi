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
import type { PolarisConfig } from "@/config/schema";

export interface DevServerOptions {
  port: number;
  dir: string; // project directory containing pages/ and data/
  config: PolarisConfig;
}

export async function startDevServer({ port, dir, config }: DevServerOptions) {
  const projectDir = path.resolve(dir);
  const dataDir = path.join(projectDir, config.data.dir);
  const pagesDir = path.join(projectDir, "pages");
  const modelsDir = path.join(projectDir, config.models.dir);

  // 1. Initialize DuckDB with data files
  console.log(`[polaris] Loading data from ${dataDir}`);
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

  // 5. Serve docs site at /docs (if built)
  const docsDistDir = path.resolve(import.meta.dirname, "../../docs-site/dist");
  if (fs.existsSync(docsDistDir)) {
    // Redirect /docs to the first docs page
    app.get("/docs", (_req, res) => res.redirect("/docs/getting-started/"));
    app.get("/docs/", (_req, res) => res.redirect("/docs/getting-started/"));
    // Serve static assets and pages
    app.use("/docs", express.static(docsDistDir));
    // Fallback: serve the docs 404 page for unmatched /docs/* routes
    // (prevents Vite SPA from intercepting docs URLs)
    app.use("/docs", (_req, res) => {
      const notFoundPage = path.join(docsDistDir, "404.html");
      if (fs.existsSync(notFoundPage)) {
        res.status(404).sendFile(notFoundPage);
      } else {
        res.status(404).send("Page not found");
      }
    });
  }

  // 6. Create Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: path.resolve(import.meta.dirname, "../.."),
  });

  // 7. Use Vite's middleware for everything else (SPA + HMR)
  app.use(vite.middlewares);

  // 8. Create HTTP server (needed for WebSocket upgrade)
  const httpServer = createHttpServer(app);

  // 9. Start file watcher with WebSocket for HMR
  startFileWatcher({
    httpServer,
    pagesDir,
    dataDir,
    modelsDir: fs.existsSync(modelsDir) ? modelsDir : undefined,
    onModelsChange: () => {
      console.log("[polaris] Reloading semantic model...");
      semanticModel = loadSemanticModel(modelsDir);
    },
  });

  // 10. Start listening — retry on next port if busy
  const maxRetries = 10;
  let currentPort = port;

  function tryListen() {
    httpServer.listen(currentPort, () => {
      console.log(`\n  [polaris] Dev server running at http://localhost:${currentPort}`);
      if (fs.existsSync(docsDistDir)) {
        console.log(`  [polaris] Docs available at http://localhost:${currentPort}/docs`);
      }
      console.log();
    });
  }

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && currentPort - port < maxRetries) {
      console.log(`  [polaris] Port ${currentPort} is in use, trying ${currentPort + 1}...`);
      currentPort++;
      tryListen();
    } else {
      throw err;
    }
  });

  tryListen();
}
