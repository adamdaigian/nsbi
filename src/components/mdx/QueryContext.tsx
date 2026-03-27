"use client";

import { createContext, useContext } from "react";

type QueryResults = Record<string, Record<string, unknown>[]>;

const QueryContext = createContext<QueryResults>({});

export function QueryProvider({
  results,
  children,
}: {
  results: QueryResults;
  children: React.ReactNode;
}) {
  return (
    <QueryContext.Provider value={results}>{children}</QueryContext.Provider>
  );
}

export function useQueryData(name: string): Record<string, unknown>[] {
  const results = useContext(QueryContext);
  return results[name] || [];
}
