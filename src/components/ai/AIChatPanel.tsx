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

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {hasMessages ? (
        <>
          {/* Header — only when conversation is active */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-sm font-semibold text-foreground">Chat</span>
            <button
              onClick={clearMessages}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Messages — centered column */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[720px] mx-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i}>
                  <AIChatMessage role={msg.role} content={msg.content} />
                  {msg.role === "assistant" && !isStreaming && extractMDX(msg.content) && (
                    <div className="flex gap-2 mt-1.5">
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
          </div>

          {/* Input — pinned to bottom, centered */}
          <div className="border-t border-border shrink-0">
            <form onSubmit={handleSubmit} className="max-w-[720px] mx-auto px-4 py-3">
              <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Describe a chart or dashboard..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[24px] max-h-[120px]"
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="shrink-0 rounded-lg p-1.5 bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      ) : (
        /* Empty state — centered welcome + input */
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">What can I help you build?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Describe a chart, dashboard, or analysis and I'll generate it for you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-[600px]">
            <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="e.g. Show me monthly revenue by region..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[24px] max-h-[120px]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="shrink-0 rounded-lg p-1.5 bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex gap-2 mt-4">
            {["Monthly revenue trend", "Top accounts table", "Churn by segment"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => { setInput(suggestion); }}
                className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
