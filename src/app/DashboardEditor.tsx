import React, { useState, useCallback, useEffect, useRef } from "react";
import { useEditorState } from "./useEditorState";
import { DashboardPreview } from "./DashboardPreview";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { RightPanel } from "@/components/editor/RightPanel";
import { cn } from "@/lib/utils";

interface DashboardEditorProps {
  pagePath: string;
}

export function DashboardEditor({ pagePath }: DashboardEditorProps) {
  const editor = useEditorState(pagePath);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorWidth, setEditorWidth] = useState(600);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = editorWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.max(400, Math.min(900, dragStartWidth.current + delta));
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [editorWidth]);

  const handleApplyContent = useCallback(
    (content: string) => {
      editor.setContent(content);
    },
    [editor],
  );

  const handleSave = useCallback(async () => {
    if (!editor.isDirty) return;
    try {
      await editor.save();
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [editor]);

  // Global Cmd+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (editor.isDirty) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor.isDirty, handleSave]);

  if (editor.loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (editor.error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-md border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {editor.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Editor panel (left) */}
      {editorVisible && (
        <div className="flex shrink-0 flex-col border-r bg-card relative" style={{ width: editorWidth }}>
          {/* Toolbar */}
          <div className="flex h-10 items-center justify-between border-b px-3">
            <span className="text-xs font-medium text-foreground">Editor</span>
            <div className="flex items-center gap-2">
              {editor.isDirty ? (
                <>
                  <button
                    onClick={editor.revert}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    Revert
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={editor.saving}
                    className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {editor.saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Saved</span>
              )}
            </div>
          </div>

          {/* CodeMirror editor */}
          <div className="flex-1 min-h-0">
            <MarkdownEditor
              value={editor.content}
              onChange={editor.setContent}
              onSave={handleSave}
            />
          </div>
          {/* Resize handle */}
          <div
            onMouseDown={handleDragStart}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
          />
        </div>
      )}

      {/* Preview panel (center) */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex h-10 items-center justify-between border-b px-3 sticky top-0 bg-background z-10">
          <button
            onClick={() => setEditorVisible(!editorVisible)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs transition-colors",
              editorVisible
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Editor
          </button>
          <span className="text-xs font-medium text-foreground">Preview</span>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs transition-colors",
              rightPanelOpen
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Chat / Schema
          </button>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto">
          <DashboardPreview content={editor.content} />
        </div>
      </div>

      {/* Right panel */}
      {rightPanelOpen && (
        <div className="w-[320px] shrink-0 border-l">
          <RightPanel
            pageContent={editor.content}
            onApplyContent={handleApplyContent}
          />
        </div>
      )}
    </div>
  );
}
