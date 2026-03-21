import React, { useEffect, useState, useCallback, useRef } from "react";
import { parseDocument, interpolateSQL } from "@/engine/parser";
import { compileMDX } from "@/engine/mdx-compiler";
import { vizRegistry } from "@/components/registry";
import { QueryProvider, type QueryResult } from "@/components/QueryContext";
import { FilterProvider } from "@/components/inputs/FilterContext";
import { useHotReload } from "./useHotReload";
import { useQueryEngine } from "@/engine/EngineContext";
import type { SQLQueryBlock, QueryBlock, SemanticQueryBlockDoc } from "@/types/document";

declare const __NSBI_STATIC__: boolean | undefined;

type QueryResultMap = Record<string, QueryResult>;

interface PageData {
  content: string;
  queryResults?: Record<string, { rows: Record<string, unknown>[]; columns: { name: string; type: string }[] }>;
  hasFilteredQueries?: boolean;
}

interface DashboardPageProps {
  pagePath?: string;
  onTitleChange?: (title: string) => void;
}

/**
 * Orchestrator: fetch MDX → parse → execute queries → compile MDX → render.
 * Supports both dev mode (server fetch) and static mode (pre-rendered data + optional WASM).
 */
export function DashboardPage({ pagePath = "index", onTitleChange }: DashboardPageProps) {
  const engine = useQueryEngine();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [queries, setQueries] = useState<QueryResultMap>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MDXContent, setMDXContent] = useState<React.ComponentType<any> | null>(null);

  // Filter state
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const parsedQueriesRef = useRef<QueryBlock[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterInitializedRef = useRef(false);
  // HMR reload trigger
  const [reloadKey, setReloadKey] = useState(0);

  const isStatic = typeof __NSBI_STATIC__ !== "undefined" && __NSBI_STATIC__;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Hot reload: re-fetch page on .mdx change, re-execute queries on data change
  useHotReload({
    currentPage: pagePath,
    onPageChange: useCallback(() => setReloadKey((k) => k + 1), []),
    onDataChange: useCallback(() => setReloadKey((k) => k + 1), []),
    disabled: isStatic,
  });

  // Execute a semantic query via the dev server
  const executeSemanticQuery = useCallback(
    async (q: SemanticQueryBlockDoc) => {
      const res = await fetch("/api/semantic-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: q.topic,
          dimensions: q.dimensions,
          measures: q.measures,
          filters: q.filters,
          timeGrain: q.timeGrain,
          dateRange: q.dateRange,
          orderBy: q.orderBy,
          limit: q.limit,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json()) as { error: string };
        throw new Error(errBody.error);
      }
      return (await res.json()) as { rows: Record<string, unknown>[]; columns: { name: string; type: string }[] };
    },
    [],
  );

  // Execute queries with current filter values via the engine
  const executeQueries = useCallback(
    async (queryBlocks: QueryBlock[], filters: Record<string, unknown>) => {
      const queryResults: QueryResultMap = {};
      const queryPromises = queryBlocks.map(async (q: QueryBlock) => {
        try {
          let data: { rows: Record<string, unknown>[]; columns: { name: string; type: string }[] };

          if (q.type === "semantic") {
            data = await executeSemanticQuery(q as SemanticQueryBlockDoc);
          } else {
            const sqlBlock = q as SQLQueryBlock;
            const sql = sqlBlock.filterVariables?.length
              ? interpolateSQL(sqlBlock.sql, filters)
              : sqlBlock.sql;
            data = await engine.executeQuery(sql);
          }

          queryResults[q.name] = {
            rows: data.rows,
            columns: data.columns,
            loading: false,
            error: null,
          };
        } catch (err) {
          queryResults[q.name] = {
            rows: [],
            columns: [],
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      });

      await Promise.all(queryPromises);
      return queryResults;
    },
    [engine, executeSemanticQuery],
  );

  // Fetch page content — dev mode uses /api/page, static mode uses /_nsbi_data/{path}.json
  const fetchPageData = useCallback(async (): Promise<PageData> => {
    if (isStatic) {
      const res = await fetch(`/_nsbi_data/${encodeURIComponent(pagePath)}.json`);
      if (!res.ok) throw new Error(`Failed to fetch page data: ${res.statusText}`);
      return (await res.json()) as PageData;
    }

    const pageRes = await fetch(`/api/page?path=${encodeURIComponent(pagePath)}`);
    if (!pageRes.ok) throw new Error(`Failed to fetch page: ${pageRes.statusText}`);
    const { content } = (await pageRes.json()) as { content: string };
    return { content };
  }, [pagePath, isStatic]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setStatus("loading");
        setFilterValues({});
        filterInitializedRef.current = false;

        // 1. Fetch page content
        const pageData = await fetchPageData();
        if (cancelled) return;

        // 2. Parse document
        const parsed = parseDocument(pageData.content);
        if (cancelled) return;
        setTitle(parsed.frontmatter.title ?? "");
        setDescription(parsed.frontmatter.description ?? "");
        onTitleChange?.(parsed.frontmatter.title ?? "");
        parsedQueriesRef.current = parsed.queries;

        // 3. Execute queries
        const staticQueries = parsed.queries.filter((q) =>
          q.type === "semantic" || !(q as SQLQueryBlock).filterVariables?.length,
        );
        const filteredQueries = parsed.queries.filter((q) =>
          q.type !== "semantic" && (q as SQLQueryBlock).filterVariables?.length,
        );

        let queryResults: QueryResultMap;

        if (isStatic && pageData.queryResults) {
          // Static mode: use pre-rendered query results
          queryResults = {};
          for (const [name, result] of Object.entries(pageData.queryResults)) {
            queryResults[name] = {
              rows: result.rows,
              columns: result.columns,
              loading: false,
              error: null,
            };
          }
        } else {
          // Dev mode: execute queries via engine
          queryResults = await executeQueries(staticQueries, {});
        }

        if (cancelled) return;

        // Mark filtered queries as loading until filters initialize
        for (const q of filteredQueries) {
          if (!queryResults[q.name]) {
            queryResults[q.name] = { rows: [], columns: [], loading: true, error: null };
          }
        }
        setQueries(queryResults);

        // 4. Compile MDX
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { Component } = await compileMDX(parsed.content, vizRegistry as any);
        if (cancelled) return;
        setMDXContent(() => Component);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[nsbi] Dashboard load error:", err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [pagePath, reloadKey, executeQueries, fetchPageData, onTitleChange, isStatic]);

  // Re-execute filtered queries when filter values change (debounced)
  useEffect(() => {
    if (status !== "ready") return;
    const queryBlocks = parsedQueriesRef.current;
    const affectedQueries = queryBlocks.filter((q) =>
      q.type !== "semantic" && (q as SQLQueryBlock).filterVariables?.length,
    );
    if (affectedQueries.length === 0) return;

    // Check all required filter variables have values
    const allVars = new Set(affectedQueries.flatMap((q) => (q as SQLQueryBlock).filterVariables ?? []));
    const allSet = [...allVars].every((v) => filterValues[v] !== undefined);
    if (!allSet) return; // wait for input defaults to initialize

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await executeQueries(affectedQueries, filterValues);
      setQueries((prev) => ({ ...prev, ...results }));
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterValues, status, executeQueries]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#5A7B8F", borderTopColor: "transparent" }}
          />
          <span className="text-[14px] text-[#949494]">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-[8px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] p-6 max-w-[500px]">
          <h3 className="text-[14px] font-semibold text-[hsl(0,84%,60%)] mb-2">
            Dashboard Error
          </h3>
          <p className="text-[13px] text-[#949494]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && (
            <h1 className="text-[24px] font-semibold leading-[1.3] text-[#FFFFFF]">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-[14px] leading-[1.5] text-[#949494]">
              {description}
            </p>
          )}
        </div>
      )}

      {/* MDX Content wrapped in FilterProvider + QueryProvider */}
      <FilterProvider values={filterValues} onChange={handleFilterChange}>
        <QueryProvider queries={queries}>
          {MDXContent && <MDXContent />}
        </QueryProvider>
      </FilterProvider>
    </div>
  );
}
