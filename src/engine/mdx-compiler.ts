import type { ComponentType } from "react";

/**
 * Compile and evaluate MDX content into a React component.
 *
 * Passes the provided component map so that <LineChart>, <BarChart>, etc.
 * resolve to the nsbi viz components at render time.
 *
 * Uses dynamic import of @mdx-js/mdx because it's an ESM-only package.
 */
export async function compileMDX(
  content: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<string, ComponentType<any>>,
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<{ components?: Record<string, ComponentType<any>> }>;
}> {
  const { evaluate } = await import("@mdx-js/mdx");
  const runtime = await import("react/jsx-runtime");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await evaluate(content, {
    ...(runtime as any),
    useMDXComponents: () => components,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { Component: result.default as ComponentType<{ components?: Record<string, ComponentType<any>> }> };
}
