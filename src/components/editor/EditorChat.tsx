import React, { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/ai/useAIChat";

interface EditorChatProps {
  pageContent: string;
  onApplyContent: (content: string) => void;
}

const CODE_BLOCK_RE = /```(?:md|mdx|markdown)?\s*\n([\s\S]*?)```/;

export function EditorChat({ pageContent, onApplyContent }: EditorChatProps) {
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
    sendMessage(trimmed, pageContent);
  };

  const extractContent = (text: string): string | null => {
    const match = text.match(CODE_BLOCK_RE);
    return match?.[1] ?? null;
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {hasMessages ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-xs font-medium text-foreground">Chat</span>
            <button
              onClick={clearMessages}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-3 space-y-3">
              {messages.map((msg, i) => {
                const extracted = msg.role === "assistant" ? extractContent(msg.content) : null;
                const textContent = extracted
                  ? msg.content.replace(CODE_BLOCK_RE, "").trim()
                  : msg.content;

                return (
                  <div key={i}>
                    <div
                      className={`rounded-md px-2.5 py-1.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-accent text-foreground"
                      }`}
                    >
                      {textContent && (
                        <div className="whitespace-pre-wrap">{textContent}</div>
                      )}
                      {extracted && (
                        <pre className="mt-1.5 overflow-x-auto rounded bg-background/40 p-1.5 text-[11px] text-muted-foreground font-mono">
                          <code>{extracted}</code>
                        </pre>
                      )}
                    </div>
                    {msg.role === "assistant" && !isStreaming && extracted && (
                      <button
                        onClick={() => onApplyContent(extracted)}
                        className="mt-1 text-[11px] px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                      >
                        Edit Page
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border shrink-0 px-3 py-2">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-1.5 items-end bg-card border border-border rounded-lg px-2 py-1.5">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask a question..."
                  rows={1}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[20px] max-h-[80px]"
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="shrink-0 rounded p-1 bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="shrink-0 rounded p-1 bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-xs text-muted-foreground text-center mb-4">
            Ask me to modify this dashboard.
          </p>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex gap-1.5 items-end bg-card border border-border rounded-lg px-2 py-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="e.g. Add a churn chart"
                rows={1}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[20px] max-h-[80px]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="shrink-0 rounded p-1 bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </form>

          <button
            onClick={() => setInput("Add a churn rate chart")}
            className="mt-3 px-2.5 py-1 text-[11px] rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Add a churn rate chart
          </button>
        </div>
      )}
    </div>
  );
}
