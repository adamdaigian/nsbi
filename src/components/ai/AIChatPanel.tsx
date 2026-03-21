import React, { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/ai/useAIChat";
import { AIChatMessage } from "./AIChatMessage";

interface AIChatPanelProps {
  onApplyMDX?: (mdx: string) => void;
  onCreatePage?: (mdx: string) => void;
}

export function AIChatPanel({ onApplyMDX, onCreatePage }: AIChatPanelProps) {
  const { messages, sendMessage, isStreaming, stopStreaming, clearMessages } = useAIChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  };

  const extractMDX = (content: string): string | null => {
    const match = content.match(/```(?:mdx)?\s*\n([\s\S]*?)```/);
    return match?.[1] ?? null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">AI Assistant</span>
        <button
          onClick={clearMessages}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[13px] text-muted-foreground">Ask me to create charts and dashboards.</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              e.g. "Show me monthly revenue by region"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <AIChatMessage role={msg.role} content={msg.content} />
            {/* Action buttons for assistant messages with MDX */}
            {msg.role === "assistant" && !isStreaming && extractMDX(msg.content) && (
              <div className="flex gap-2 mt-1.5 ml-0">
                {onApplyMDX && (
                  <button
                    onClick={() => onApplyMDX(extractMDX(msg.content)!)}
                    className="text-[11px] px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  >
                    Apply to page
                  </button>
                )}
                {onCreatePage && (
                  <button
                    onClick={() => onCreatePage(extractMDX(msg.content)!)}
                    className="text-[11px] px-2 py-0.5 rounded bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Create new page
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-3 py-2 border-t border-border"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe a chart or dashboard..."
            className="flex-1 bg-accent rounded px-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="shrink-0 rounded px-2 py-1.5 text-[11px] bg-red-bg text-destructive hover:bg-red-bg transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 rounded px-2 py-1.5 text-[11px] bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
