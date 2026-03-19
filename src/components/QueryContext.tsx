"use client";

import React, { createContext, useContext, useMemo } from "react";

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  loading: boolean;
  error: string | null;
}

type QueryResultMap = Record<string, QueryResult>;

const QueryCtx = createContext<QueryResultMap>({});

interface QueryProviderProps {
  queries: QueryResultMap;
  children: React.ReactNode;
}

export function QueryProvider({ queries, children }: QueryProviderProps) {
  const value = useMemo(() => queries, [queries]);
  return <QueryCtx.Provider value={value}>{children}</QueryCtx.Provider>;
}

export function useQueryData(queryName: string): QueryResult {
  const map = useContext(QueryCtx);
  return (
    map[queryName] ?? {
      rows: [],
      columns: [],
      loading: true,
      error: null,
    }
  );
}
