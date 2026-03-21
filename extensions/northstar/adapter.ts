/**
 * NorthstarBridge — allows Northstar to use nsbi as a rendering engine.
 *
 * Usage in Northstar:
 *   import { NorthstarBridge } from 'nsbi/extensions/northstar/adapter';
 *   const bridge = new NorthstarBridge();
 *   const html = await bridge.render({ mdxContent, queryResults });
 */

import { compileMDX } from "@/engine/mdx-compiler";
import { vizRegistry } from "@/components/registry";

export interface RenderInput {
  mdxContent: string;
  queryResults: Record<
    string,
    { rows: Record<string, unknown>[]; columns: { name: string; type: string }[] }
  >;
}

export interface RenderOutput {
  Component: React.ComponentType;
  queryResults: Record<
    string,
    {
      rows: Record<string, unknown>[];
      columns: { name: string; type: string }[];
      loading: boolean;
      error: null;
    }
  >;
}

export class NorthstarBridge {
  /**
   * Compile MDX and prepare for rendering with pre-computed query results.
   */
  async render(input: RenderInput): Promise<RenderOutput> {
    // Strip frontmatter and query blocks (Northstar pre-executes queries)
    const mdxContent = input.mdxContent
      .replace(/^---\n[\s\S]*?\n---/, "")
      .replace(/```sql\s*\n[\s\S]*?```/g, "")
      .replace(/```semantic\s*\n[\s\S]*?```/g, "")
      .trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Component } = await compileMDX(mdxContent, vizRegistry as any);

    // Convert query results to the format expected by QueryProvider
    const queryResults: RenderOutput["queryResults"] = {};
    for (const [name, result] of Object.entries(input.queryResults)) {
      queryResults[name] = {
        rows: result.rows,
        columns: result.columns,
        loading: false,
        error: null,
      };
    }

    return { Component, queryResults };
  }

  /**
   * Get the component registry for direct use.
   */
  getComponentRegistry() {
    return vizRegistry;
  }
}
