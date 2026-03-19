import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Base path can be overridden at build time via --base flag or
  // define: { __NSBI_BASE_PATH__: '"/repo-name/"' } from the build command
  base: process.env.NSBI_BASE_PATH || "/",
  optimizeDeps: {
    exclude: command === "build" ? ["@duckdb/duckdb-wasm"] : [],
  },
  worker: {
    format: "es" as const,
  },
}));
