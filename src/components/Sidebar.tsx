import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

declare const __POLARIS_STATIC__: boolean | undefined;

interface PageNode {
  name: string;
  path: string;
  children?: PageNode[];
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (path: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ currentPage, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const [pages, setPages] = useState<PageNode[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isStatic = typeof __POLARIS_STATIC__ !== "undefined" && __POLARIS_STATIC__;

  const fetchPages = useCallback(async () => {
    try {
      const url = isStatic ? "/_polaris_data/pages.json" : "/api/pages";
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { pages: PageNode[] };
        setPages(data.pages);
      }
    } catch {
      // silently fail — sidebar just won't show pages
    }
  }, [isStatic]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const toggleCollapse = (dirPath: string) => {
    setCollapsed((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const PAGE_LABELS: Record<string, string> = {
    "index": "Executive Metrics (L0)",
    "channel-analysis": "Channel Analysis (L1)",
    "key-drivers": "Key Drivers (L2)",
  };

  const formatName = (name: string) => {
    if (PAGE_LABELS[name]) return PAGE_LABELS[name];
    return name
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderNode = (node: PageNode, depth: number = 0) => {
    if (node.children) {
      const isCollapsed = collapsed[node.path] ?? false;
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleCollapse(node.path)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            <svg
              className={cn("h-3 w-3 shrink-0 transition-transform", !isCollapsed && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            {formatName(node.name)}
          </button>
          {!isCollapsed && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = currentPage === node.path;
    return (
      <button
        key={node.path}
        onClick={() => onNavigate(node.path)}
        className={cn(
          "flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs transition-colors",
          isActive
            ? "bg-primary/15 font-medium text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {formatName(node.name)}
      </button>
    );
  };

  const hasMultiplePages = pages.length > 1 || pages.some((p) => p.children);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-background transition-transform lg:sticky lg:top-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ height: "100%" }}
      >
        {/* Pages navigation */}
        {hasMultiplePages && (
          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pages</p>
            <div className="flex flex-col gap-0.5">
              {pages.map((node) => renderNode(node))}
            </div>
          </nav>
        )}
        {!hasMultiplePages && <div className="flex-1" />}

        {/* Theme switcher */}
        <div className="border-t border-border px-3 py-3">
          <ThemeSwitcher />
        </div>
      </aside>
    </>
  );
}
