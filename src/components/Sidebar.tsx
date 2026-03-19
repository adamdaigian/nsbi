import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

declare const __NSBI_STATIC__: boolean | undefined;

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

  const isStatic = typeof __NSBI_STATIC__ !== "undefined" && __NSBI_STATIC__;

  const fetchPages = useCallback(async () => {
    try {
      const url = isStatic ? "/_nsbi_data/pages.json" : "/api/pages";
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

  const formatName = (name: string) => {
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
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]"
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
            ? "bg-[#5A7B8F]/15 font-medium text-[#5A7B8F]"
            : "text-[#949494] hover:bg-[rgba(64,64,64,0.15)] hover:text-[#FFFFFF]",
        )}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {formatName(node.name)}
      </button>
    );
  };

  // Don't render sidebar if only one page (index)
  const hasMultiplePages = pages.length > 1 || pages.some((p) => p.children);

  if (!hasMultiplePages) return null;

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
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[rgba(148,148,148,0.12)] bg-[#0A0B0B] transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-14 items-center border-b border-[rgba(148,148,148,0.12)] px-4">
          <span className="text-sm font-semibold text-[#FFFFFF] tracking-tight">nsbi</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-0.5">
            {pages.map((node) => renderNode(node))}
          </div>
        </nav>
      </aside>
    </>
  );
}
