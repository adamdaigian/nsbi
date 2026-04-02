import fs from "fs";
import path from "path";
import { polarisConfigSchema, type PolarisConfig } from "./schema";

const CONFIG_FILES = ["polaris.config.ts", "polaris.config.js", "polaris.config.json"];

/**
 * Load Polaris config from the project root. Tries polaris.config.{ts,js,json}
 * in order, falls back to defaults if none found.
 */
export async function loadConfig(projectDir: string): Promise<PolarisConfig> {
  const resolved = path.resolve(projectDir);

  for (const filename of CONFIG_FILES) {
    const configPath = path.join(resolved, filename);
    if (!fs.existsSync(configPath)) continue;

    try {
      if (filename.endsWith(".json")) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return polarisConfigSchema.parse(raw);
      }

      // For .ts/.js files, use dynamic import with file:// URL
      const fileUrl = `file://${configPath}?t=${Date.now()}`;
      const mod = await import(fileUrl);
      const raw = mod.default ?? mod;
      return polarisConfigSchema.parse(raw);
    } catch (err) {
      console.warn(`[polaris] Failed to load ${filename}:`, err);
    }
  }

  // No config file found — use defaults
  return polarisConfigSchema.parse({});
}
