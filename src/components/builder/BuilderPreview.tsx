import React, { useEffect, useState, useCallback } from "react";
import { compileMDX } from "@/engine/mdx-compiler";
import { vizRegistry } from "@/components/registry";
import { QueryProvider, type QueryResult } from "@/components/QueryContext";
import { FilterProvider } from "@/components/inputs/FilterContext";
import { useQueryEngine } from "@/engine/EngineContext";
import { pageSpecToMDX } from "@/builder/codegen";
import { parseDocument, interpolateSQL } from "@/engine/parser";
import type { PageSpec } from "@/builder/types";
import type { SQLQueryBlock } from "@/types/document";

interface BuilderPreviewProps {
  pageSpec: PageSpec;
}

type QueryResultMap = Record<string, QueryResult>;

export function BuilderPreview({ pageSpec }: BuilderPreviewProps) {
  const engine = useQueryEngine();
  const [queries, setQueries] = useState<QueryResultMap>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MDXContent, setMDXContent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const renderPreview = useCallback(async () => {
    try {
      const mdx = pageSpecToMDX(pageSpec);
      const parsed = parseDocument(mdx);

      // Execute queries
      const queryResults: QueryResultMap = {};
      for (const q of parsed.queries) {
        try {
          if (q.type === "sql") {
            const sqlBlock = q as SQLQueryBlock;
            const data = await engine.executeQuery(sqlBlock.sql);
            queryResults[q.name] = { rows: data.rows, columns: data.columns, loading: false, error: null };
          }
        } catch (err) {
          queryResults[q.name] = {
            rows: [],
            columns: [],
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }
      setQueries(queryResults);

      // Compile MDX
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Component } = await compileMDX(parsed.content, vizRegistry as any);
      setMDXContent(() => Component);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [pageSpec, engine]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)]">
        <p className="text-[12px] text-[hsl(0,84%,60%)]">Preview Error: {error}</p>
      </div>
    );
  }

  if (!MDXContent) {
    return (
      <div className="flex items-center justify-center py-12 text-[12px] text-[#666]">
        Add a query and chart to see preview
      </div>
    );
  }

  return (
    <FilterProvider values={{}} onChange={() => {}}>
      <QueryProvider queries={queries}>
        <div className="flex flex-col gap-4">
          <MDXContent />
        </div>
      </QueryProvider>
    </FilterProvider>
  );
}
