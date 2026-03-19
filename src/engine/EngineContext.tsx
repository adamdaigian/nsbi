"use client";

import React, { createContext, useContext } from "react";
import type { QueryEngine } from "./query-engine";

const EngineCtx = createContext<QueryEngine | null>(null);

interface EngineProviderProps {
  engine: QueryEngine;
  children: React.ReactNode;
}

export function EngineProvider({ engine, children }: EngineProviderProps) {
  return <EngineCtx.Provider value={engine}>{children}</EngineCtx.Provider>;
}

export function useQueryEngine(): QueryEngine {
  const engine = useContext(EngineCtx);
  if (!engine) {
    throw new Error("useQueryEngine must be used within an EngineProvider");
  }
  return engine;
}
