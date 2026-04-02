import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardEditor } from "./DashboardEditor";
import { Sidebar } from "@/components/Sidebar";
import { Header, type AppMode } from "@/components/Header";
import { EngineProvider } from "@/engine/EngineContext";
import { ServerQueryEngine } from "@/engine/server-engine";
import { LazyWasmEngine } from "@/engine/lazy-wasm-engine";
import type { QueryEngine } from "@/engine/query-engine";
import { SchemaProvider } from "@/components/schema/SchemaContext";
import { SchemaExplorer } from "@/components/schema/SchemaExplorer";
import { AIChatPanel } from "@/components/ai/AIChatPanel";

declare const __POLARIS_STATIC__: boolean | undefined;
declare const __POLARIS_HAS_WASM__: boolean | undefined;

function getPageFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || "index";
}

export function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<AppMode>("dashboards");

  const isStatic = typeof __POLARIS_STATIC__ !== "undefined" && __POLARIS_STATIC__;

  const engine = useMemo<QueryEngine>(() => {
    const isStatic = typeof __POLARIS_STATIC__ !== "undefined" && __POLARIS_STATIC__;
    const hasWasm = typeof __POLARIS_HAS_WASM__ !== "undefined" && __POLARIS_HAS_WASM__;
    if (isStatic && hasWasm) return new LazyWasmEngine();
    if (isStatic) return { executeQuery: async () => { throw new Error("No query engine available in static-only mode"); } };
    return new ServerQueryEngine();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = useCallback((pagePath: string) => {
    window.location.hash = `#/${pagePath}`;
    setSidebarOpen(false);
  }, []);

  return (
    <EngineProvider engine={engine}>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Header
          activeMode={activeMode}
          onModeChange={setActiveMode}
          isStatic={isStatic}
          onMobileMenuToggle={() => setSidebarOpen(true)}
        />
        <div className="flex flex-1 min-h-0">
          {activeMode === "dashboards" && (
            <Sidebar
              currentPage={currentPage}
              onNavigate={navigateTo}
              mobileOpen={sidebarOpen}
              onMobileClose={() => setSidebarOpen(false)}
            />
          )}
          <main className="flex-1 min-w-0">
            {activeMode === "dashboards" && (
              <DashboardEditor key={currentPage} pagePath={currentPage} />
            )}
            {activeMode === "schema" && (
              <SchemaProvider>
                <SchemaExplorer />
              </SchemaProvider>
            )}
            {activeMode === "chat" && (
              <AIChatPanel />
            )}
          </main>
        </div>
      </div>
    </EngineProvider>
  );
}
