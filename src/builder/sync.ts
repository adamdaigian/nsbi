import type { PageSpec } from "./types";
import { pageSpecToMDX } from "./codegen";
import { mdxToPageSpec } from "./parse-mdx";

/**
 * MDXSync controller — keeps builder state and MDX text in sync.
 */
export class MDXSync {
  private lastMDX: string = "";
  private lastSpec: PageSpec | null = null;

  /**
   * Builder changed → generate new MDX.
   */
  applyBuilderChange(spec: PageSpec): string {
    const mdx = pageSpecToMDX(spec);
    this.lastMDX = mdx;
    this.lastSpec = spec;
    return mdx;
  }

  /**
   * MDX text changed → parse into PageSpec.
   */
  applyMDXChange(newMDX: string): PageSpec {
    if (newMDX === this.lastMDX) {
      return this.lastSpec!;
    }
    const spec = mdxToPageSpec(newMDX);
    this.lastMDX = newMDX;
    this.lastSpec = spec;
    return spec;
  }
}
