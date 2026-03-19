import { useEffect, useRef } from "react";

interface HotReloadMessage {
  type: "page-change" | "data-change" | "pages-update";
  path?: string;
}

/**
 * Connects to the nsbi dev server WebSocket for hot reload notifications.
 * Calls `onPageChange` when the current page's .mdx file changes.
 * Calls `onDataChange` when a data file changes.
 * Calls `onPagesUpdate` when the page tree changes (add/remove).
 */
export function useHotReload({
  currentPage,
  onPageChange,
  onDataChange,
  onPagesUpdate,
}: {
  currentPage: string;
  onPageChange: () => void;
  onDataChange: () => void;
  onPagesUpdate?: () => void;
}) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/__nsbi_ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as HotReloadMessage;
        if (msg.type === "page-change" && msg.path === currentPage) {
          onPageChange();
        } else if (msg.type === "data-change") {
          onDataChange();
        } else if (msg.type === "pages-update") {
          onPagesUpdate?.();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Reconnect after a brief delay
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 1000);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [currentPage, onPageChange, onDataChange, onPagesUpdate]);
}
