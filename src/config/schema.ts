import { z } from "zod";

export const nsbiConfigSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  theme: z.enum(["dark", "light"]).default("dark"),
  basePath: z.string().default("/"),
  data: z
    .object({
      dir: z.string().default("data"),
    })
    .default({ dir: "data" }),
  models: z
    .object({
      dir: z.string().default("models"),
    })
    .default({ dir: "models" }),
  ai: z
    .object({
      provider: z.enum(["anthropic", "openai"]).default("anthropic"),
      apiKey: z.string().optional(),
      model: z.string().default("claude-sonnet-4-20250514"),
    })
    .default({ provider: "anthropic", model: "claude-sonnet-4-20250514" }),
  build: z
    .object({
      outDir: z.string().default("dist"),
    })
    .default({ outDir: "dist" }),
});

export type NsbiConfig = z.infer<typeof nsbiConfigSchema>;
