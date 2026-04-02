import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { EditorChat } from "./EditorChat";
import { SchemaProvider } from "@/components/schema/SchemaContext";
import { SchemaExplorer } from "@/components/schema/SchemaExplorer";

type RightTab = "chat" | "schema";

interface RightPanelProps {
  pageContent: string;
  onApplyContent: (content: string) => void;
}

export function RightPanel({ pageContent, onApplyContent }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>("chat");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-0.5 border-b px-3 h-10">
        <button
          className={cn(
            "rounded-md px-3 py-1.5 text-xs transition-colors",
            activeTab === "chat"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
          onClick={() => setActiveTab("chat")}
        >
          Chat
        </button>
        <button
          className={cn(
            "rounded-md px-3 py-1.5 text-xs transition-colors",
            activeTab === "schema"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
          onClick={() => setActiveTab("schema")}
        >
          Schema
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "chat" ? (
          <EditorChat
            pageContent={pageContent}
            onApplyContent={onApplyContent}
          />
        ) : (
          <SchemaProvider>
            <SchemaExplorer />
          </SchemaProvider>
        )}
      </div>
    </div>
  );
}
