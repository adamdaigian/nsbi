import React from "react";
// TODO: reconnect after YAML config parser
// import { compileMDX } from "@/engine/mdx-compiler";
// import { vizRegistry } from "@/components/registry";
// import { QueryProvider, type QueryResult } from "@/components/QueryContext";
// import { pageSpecToMDX } from "@/builder/codegen";
import type { PageSpec } from "@/builder/types";

interface BuilderPreviewProps {
  pageSpec: PageSpec;
}

/**
 * TODO: Reimplement with YAML config + VegaChart.
 * Previously compiled MDX and rendered via QueryProvider + vizRegistry.
 */
export function BuilderPreview({ pageSpec }: BuilderPreviewProps) {
  return (
    <div className="flex items-center justify-center py-12 text-[12px] text-muted-foreground">
      Preview is being migrated to YAML config + Vega-Lite.
    </div>
  );
}
