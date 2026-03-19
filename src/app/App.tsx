import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardPage } from "./DashboardPage";
import { Sidebar } from "@/components/Sidebar";
import { EngineProvider } from "@/engine/EngineContext";
import { ServerQueryEngine } from "@/engine/server-engine";
import type { QueryEngine } from "@/engine/query-engine";

declare const __NSBI_STATIC__: boolean | undefined;
declare const __NSBI_HAS_WASM__: boolean | undefined;

function getPageFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash || "index";
}

export function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const engine = useMemo<QueryEngine>(() => {
    const isStatic = typeof __NSBI_STATIC__ !== "undefined" && __NSBI_STATIC__;
    const hasWasm = typeof __NSBI_HAS_WASM__ !== "undefined" && __NSBI_HAS_WASM__;

    if (isStatic && hasWasm) {
      // Dynamic import to avoid bundling WASM when not needed
      // LazyWasmEngine defers init until first query
      const { LazyWasmEngine } = require("@/engine/lazy-wasm-engine");
      return new LazyWasmEngine();
    }

    if (isStatic) {
      // Static-only mode: no WASM needed, but still need an engine for the interface.
      // Queries are pre-rendered; this engine is a no-op fallback.
      return {
        executeQuery: async () => {
          throw new Error("No query engine available in static-only mode");
        },
      };
    }

    // Dev mode
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
      <div className="flex min-h-screen bg-[#0A0B0B] text-[#FFFFFF]">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigateTo}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile header with hamburger */}
          <div className="flex items-center gap-3 px-6 py-4 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          <div className="mx-auto max-w-[1200px] px-6 py-8">
            <DashboardPage key={currentPage} pagePath={currentPage} />
          </div>
        </main>
      </div>
    </EngineProvider>
  );
}
