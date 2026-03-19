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
    .default({}),
  build: z
    .object({
      outDir: z.string().default("dist"),
    })
    .default({}),
});

export type NsbiConfig = z.infer<typeof nsbiConfigSchema>;
