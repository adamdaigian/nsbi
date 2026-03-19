import fs from "fs";
import path from "path";
import { nsbiConfigSchema, type NsbiConfig } from "./schema";

const CONFIG_FILES = ["nsbi.config.ts", "nsbi.config.js", "nsbi.config.json"];

/**
 * Load nsbi config from the project root. Tries nsbi.config.{ts,js,json}
 * in order, falls back to defaults if none found.
 */
export async function loadConfig(projectDir: string): Promise<NsbiConfig> {
  const resolved = path.resolve(projectDir);

  for (const filename of CONFIG_FILES) {
    const configPath = path.join(resolved, filename);
    if (!fs.existsSync(configPath)) continue;

    try {
      if (filename.endsWith(".json")) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return nsbiConfigSchema.parse(raw);
      }

      // For .ts/.js files, use dynamic import with file:// URL
      const fileUrl = `file://${configPath}?t=${Date.now()}`;
      const mod = await import(fileUrl);
      const raw = mod.default ?? mod;
      return nsbiConfigSchema.parse(raw);
    } catch (err) {
      console.warn(`[nsbi] Failed to load ${filename}:`, err);
    }
  }

  // No config file found — use defaults
  return nsbiConfigSchema.parse({});
}
