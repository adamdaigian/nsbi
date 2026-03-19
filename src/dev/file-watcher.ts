import { watch } from "chokidar";
import { WebSocketServer, type WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import path from "path";
import { reRegisterTable } from "@/engine/duckdb";

export interface FileWatcherOptions {
  httpServer: HttpServer;
  pagesDir: string;
  dataDir: string;
}

export function startFileWatcher({ httpServer, pagesDir, dataDir }: FileWatcherOptions) {
  // WebSocket server on /ws path (avoids conflict with Vite's own WS)
  const wss = new WebSocketServer({ server: httpServer, path: "/__nsbi_ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  function broadcast(message: { type: string; path?: string }) {
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  // Watch pages directory for .mdx changes
  const pagesWatcher = watch(path.join(pagesDir, "**/*.mdx"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  pagesWatcher.on("change", (filePath) => {
    const relative = path.relative(pagesDir, filePath).replace(/\.mdx$/, "").replace(/\\/g, "/");
    console.log(`[nsbi] Page changed: ${relative}`);
    broadcast({ type: "page-change", path: relative });
  });

  pagesWatcher.on("add", (filePath) => {
    const relative = path.relative(pagesDir, filePath).replace(/\.mdx$/, "").replace(/\\/g, "/");
    console.log(`[nsbi] Page added: ${relative}`);
    broadcast({ type: "pages-update", path: relative });
  });

  pagesWatcher.on("unlink", (filePath) => {
    const relative = path.relative(pagesDir, filePath).replace(/\.mdx$/, "").replace(/\\/g, "/");
    console.log(`[nsbi] Page removed: ${relative}`);
    broadcast({ type: "pages-update", path: relative });
  });

  // Watch data directory for .csv/.parquet changes
  const dataWatcher = watch(path.join(dataDir, "**/*.{csv,parquet}"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  dataWatcher.on("change", async (filePath) => {
    console.log(`[nsbi] Data file changed: ${path.basename(filePath)}`);
    try {
      await reRegisterTable(filePath);
      broadcast({ type: "data-change", path: filePath });
    } catch (err) {
      console.error(`[nsbi] Failed to re-register table:`, err);
    }
  });

  dataWatcher.on("add", async (filePath) => {
    console.log(`[nsbi] Data file added: ${path.basename(filePath)}`);
    try {
      await reRegisterTable(filePath);
      broadcast({ type: "data-change", path: filePath });
    } catch (err) {
      console.error(`[nsbi] Failed to register table:`, err);
    }
  });

  console.log(`[nsbi] File watcher active (pages + data)`);
}
