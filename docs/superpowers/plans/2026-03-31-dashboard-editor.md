# Dashboard Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current read-only dashboard view with a three-panel editor: markdown editor (left), live preview (center), collapsible Chat/Schema panel (right). Drafts persist in localStorage, save writes to disk.

**Architecture:** The dashboard view becomes an editor workspace. A new `DashboardEditor` component orchestrates three panels sharing state via a `useEditorState` hook. The existing `DashboardPage` rendering logic is extracted into a reusable `DashboardPreview` component that accepts markdown content directly. A new `POST /api/page` endpoint writes files to disk. The "Chat" and "Builder" header modes are removed — chat moves into the right panel.

**Tech Stack:** CodeMirror 6 (editor), React (UI), localStorage (draft persistence), Express (save API)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/DashboardEditor.tsx` | Create | Three-panel editor orchestrator |
| `src/app/DashboardPreview.tsx` | Create | Renders markdown content as a dashboard (extracted from DashboardPage) |
| `src/app/useEditorState.ts` | Create | Editor state: content, draft persistence, dirty tracking |
| `src/components/editor/MarkdownEditor.tsx` | Create | CodeMirror wrapper for markdown editing |
| `src/components/editor/RightPanel.tsx` | Create | Collapsible panel with Chat/Schema tabs |
| `src/components/editor/EditorChat.tsx` | Create | Chat adapted for editor context (sends page content, has "Edit Page" action) |
| `src/components/Header.tsx` | Modify | Remove "Chat" and "Builder" modes, add right-panel toggle |
| `src/app/App.tsx` | Modify | Replace DashboardPage with DashboardEditor in dashboards mode |
| `src/dev/api-middleware.ts` | Modify | Add `POST /api/page` save endpoint |
| `src/ai/useAIChat.ts` | Modify | Add `pageContent` param so AI gets current page as context |

---

### Task 1: Install CodeMirror dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install CodeMirror packages**

```bash
npm install codemirror @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/language @codemirror/commands @codemirror/search
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@codemirror/view'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add CodeMirror 6 dependencies for dashboard editor"
```

---

### Task 2: Add `POST /api/page` save endpoint

**Files:**
- Modify: `src/dev/api-middleware.ts`

- [ ] **Step 1: Add the save endpoint**

Add this route after the existing `GET /api/page` handler (after line ~236):

```typescript
  /**
   * POST /api/page — Save page content to disk.
   * Body: { path: string, content: string }
   */
  router.post("/api/page", (req: Request, res: Response) => {
    try {
      const { path: pagePath, content } = req.body as { path: string; content: string };
      if (!pagePath || typeof content !== "string") {
        res.status(400).json({ error: "Missing 'path' or 'content' in request body" });
        return;
      }

      // Prevent path traversal
      const resolvedBase = path.resolve(pagesDir);
      const resolvedPage = path.resolve(pagesDir, pagePath);
      if (!resolvedPage.startsWith(resolvedBase + path.sep) && resolvedPage !== resolvedBase) {
        res.status(400).json({ error: "Invalid page path" });
        return;
      }

      // Determine file extension — default to .md
      const mdPath = `${resolvedPage}.md`;
      const yamlPath = `${resolvedPage}.yaml`;
      const mdxPath = `${resolvedPage}.mdx`;

      // Write to whichever format already exists, or default to .md
      let writePath = mdPath;
      if (fs.existsSync(yamlPath)) writePath = yamlPath;
      else if (fs.existsSync(mdxPath)) writePath = mdxPath;
      else if (fs.existsSync(mdPath)) writePath = mdPath;

      // Ensure parent directory exists
      const dir = path.dirname(writePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(writePath, content, "utf-8");
      console.log(`[polaris] Saved page: ${pagePath}`);
      res.json({ ok: true, path: path.relative(pagesDir, writePath) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[polaris] Page save error:", message);
      res.status(500).json({ error: message });
    }
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/dev/api-middleware.ts
git commit -m "feat: add POST /api/page endpoint to save dashboard files"
```

---

### Task 3: Create `useEditorState` hook

**Files:**
- Create: `src/app/useEditorState.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_PREFIX = "polaris-draft:";

interface EditorState {
  /** Current editor content (draft or saved) */
  content: string;
  /** Content as last saved to disk */
  savedContent: string;
  /** Whether the draft differs from saved */
  isDirty: boolean;
  /** Whether content is still loading from server */
  loading: boolean;
  /** Load error */
  error: string | null;
  /** Update the editor content (writes to localStorage draft) */
  setContent: (content: string) => void;
  /** Save content to disk via API */
  save: () => Promise<void>;
  /** Discard draft and revert to saved content */
  revert: () => void;
  /** Whether a save is in progress */
  saving: boolean;
}

export function useEditorState(pagePath: string): EditorState {
  const [savedContent, setSavedContent] = useState("");
  const [content, setContentRaw] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pagePathRef = useRef(pagePath);

  // Load page content from server, then check for localStorage draft
  useEffect(() => {
    pagePathRef.current = pagePath;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/page?path=${encodeURIComponent(pagePath)}`);
        if (!res.ok) {
          if (res.status === 404) {
            // New page — start with empty template
            const template = `---\ntitle: New Page\n---\n\n`;
            if (!cancelled) {
              setSavedContent(template);
              const draft = localStorage.getItem(STORAGE_PREFIX + pagePath);
              setContentRaw(draft ?? template);
            }
            return;
          }
          const err = (await res.json()) as { error: string };
          throw new Error(err.error);
        }

        const { content: serverContent } = (await res.json()) as { content: string };
        if (cancelled) return;

        setSavedContent(serverContent);

        // Check for localStorage draft
        const draft = localStorage.getItem(STORAGE_PREFIX + pagePath);
        if (draft && draft !== serverContent) {
          // Draft exists and differs from saved — use draft
          setContentRaw(draft);
        } else {
          // No draft or draft matches saved — use server content
          setContentRaw(serverContent);
          // Clean up matching draft
          if (draft) localStorage.removeItem(STORAGE_PREFIX + pagePath);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pagePath]);

  // Update content and persist draft to localStorage
  const setContent = useCallback((newContent: string) => {
    setContentRaw(newContent);
    localStorage.setItem(STORAGE_PREFIX + pagePathRef.current, newContent);
  }, []);

  // Save to disk
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pagePathRef.current, content }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
      }
      setSavedContent(content);
      localStorage.removeItem(STORAGE_PREFIX + pagePathRef.current);
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  }, [content]);

  // Revert to saved
  const revert = useCallback(() => {
    setContentRaw(savedContent);
    localStorage.removeItem(STORAGE_PREFIX + pagePathRef.current);
  }, [savedContent]);

  const isDirty = content !== savedContent;

  return { content, savedContent, isDirty, loading, error, setContent, save, revert, saving };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/useEditorState.ts
git commit -m "feat: add useEditorState hook with localStorage draft persistence"
```

---

### Task 4: Create `MarkdownEditor` component

**Files:**
- Create: `src/components/editor/MarkdownEditor.tsx`

- [ ] **Step 1: Create the CodeMirror wrapper**

```typescript
import React, { useRef, useEffect } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const themeCompartment = new Compartment();

function polarisTheme() {
  return EditorView.theme({
    "&": {
      fontSize: "13px",
      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      height: "100%",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: "var(--foreground)",
    },
    ".cm-line": {
      padding: "0 16px",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--muted-foreground)",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--foreground)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--accent)",
    },
    ".cm-selectionBackground": {
      backgroundColor: "var(--primary) !important",
      opacity: "0.15",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--foreground)",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--primary) !important",
      opacity: "0.15",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  });
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        highlightSelectionMatches(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        themeCompartment.of(polarisTheme()),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => { view.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount — value updates handled below

  // Sync external value changes (e.g., AI edits, revert)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full overflow-hidden" />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/MarkdownEditor.tsx
git commit -m "feat: add CodeMirror-based MarkdownEditor component"
```

---

### Task 5: Extract `DashboardPreview` from `DashboardPage`

**Files:**
- Create: `src/app/DashboardPreview.tsx`
- Modify: `src/app/DashboardPage.tsx` (keep for backward compat, delegate to Preview)

- [ ] **Step 1: Create DashboardPreview**

This component accepts markdown content directly and renders it. Extract the rendering logic from DashboardPage. The key difference: it takes `content` as a prop instead of fetching from the API.

```typescript
import React, { useEffect, useState, useRef } from 'react'
import yaml from 'js-yaml'
import { VegaChart } from '@/components/charts/VegaChart'
import { BigValue } from '@/components/charts/BigValue'
import { DataTable } from '@/components/charts/DataTable'
import { applyPreset } from '@/config/presets'
import { useQueryEngine } from '@/engine/EngineContext'
import { parseDocument } from '@/engine/parser'
import { compileMDX } from '@/engine/mdx-compiler'
import { QueryProvider, mdxComponents } from '@/components/mdx'

type QueryResults = Record<string, Record<string, unknown>[]>

interface DashboardPreviewProps {
  content: string;
  format?: 'md' | 'yaml';
}

function QueryErrorBanner({ errors }: { errors: Record<string, string> }) {
  const entries = Object.entries(errors)
  if (entries.length === 0) return null
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm space-y-1">
      {entries.map(([name, error]) => (
        <p key={name} className="text-red-400">
          <span className="font-medium">{name}:</span> {error}
        </p>
      ))}
    </div>
  )
}

export function DashboardPreview({ content, format = 'md' }: DashboardPreviewProps) {
  const engine = useQueryEngine()
  const [queryResults, setQueryResults] = useState<QueryResults>({})
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MdxContent, setMdxContent] = useState<React.ComponentType<any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Debounce re-render to avoid thrashing on every keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      let cancelled = false

      async function render() {
        setLoading(true)
        setError(null)

        try {
          if (!content.trim()) {
            setMdxContent(null)
            setQueryResults({})
            setQueryErrors({})
            return
          }

          const doc = parseDocument(content)
          const sqlQueries = doc.queries.filter(
            (q): q is import('@/types/document').SQLQueryBlock => q.type === 'sql'
          )

          const errors: Record<string, string> = {}
          const results = await Promise.all(
            sqlQueries.map(async (q) => {
              try {
                const result = await engine.executeQuery(q.sql)
                return [q.name, result.rows] as [string, Record<string, unknown>[]]
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                errors[q.name] = message
                return [q.name, [] as Record<string, unknown>[]] as [string, Record<string, unknown>[]]
              }
            })
          )

          if (cancelled) return

          const resultMap: QueryResults = {}
          for (const [name, rows] of results) {
            resultMap[name] = rows
          }
          setQueryResults(resultMap)
          setQueryErrors(errors)

          const { Component } = await compileMDX(doc.content, mdxComponents)
          if (cancelled) return
          setMdxContent(() => Component)
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : String(err))
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      }

      render()
      return () => { cancelled = true }
    }, 500) // 500ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [content, engine, format])

  if (loading && !MdxContent) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Loading preview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-red-400 text-sm max-w-lg">
          {error}
        </div>
      </div>
    )
  }

  if (MdxContent) {
    return (
      <QueryProvider results={queryResults}>
        <div className="mdx-content space-y-6 px-6 py-8 max-w-[1200px] mx-auto">
          <QueryErrorBanner errors={queryErrors} />
          <MdxContent components={mdxComponents} />
        </div>
      </QueryProvider>
    )
  }

  return null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/DashboardPreview.tsx
git commit -m "feat: extract DashboardPreview component for live content rendering"
```

---

### Task 6: Create `EditorChat` component

**Files:**
- Create: `src/components/editor/EditorChat.tsx`
- Modify: `src/ai/useAIChat.ts` — add `pageContent` parameter

- [ ] **Step 1: Update useAIChat to accept page context**

In `src/ai/useAIChat.ts`, modify `sendMessage` to accept optional page content that gets sent alongside the conversation:

Replace the `sendMessage` callback with:

```typescript
  const sendMessage = useCallback(async (userMessage: string, pageContent?: string) => {
    const userMsg: AIChatMessage = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsg: AIChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          pageContent,
        }),
        signal: abortRef.current.signal,
      });
```

The rest of the function remains the same.

- [ ] **Step 2: Update API to pass pageContent to the prompt**

In `src/dev/api-middleware.ts`, in the `POST /api/ai/generate` handler, extract `pageContent` from the request body and pass it to the prompt builder:

Change:
```typescript
const { messages } = req.body as { messages: ChatMessage[] };
```
To:
```typescript
const { messages, pageContent } = req.body as { messages: ChatMessage[]; pageContent?: string };
```

And change the system prompt call:
```typescript
const systemPrompt = buildPolarisSystemPrompt({ schema: schemaContext, topics, existingContent: pageContent });
```

- [ ] **Step 3: Create EditorChat component**

Create `src/components/editor/EditorChat.tsx`:

```typescript
import React, { useState } from "react";
import { useAIChat } from "@/ai/useAIChat";
import { AIChatMessage } from "@/components/ai/AIChatMessage";

interface EditorChatProps {
  pageContent: string;
  onApplyContent: (content: string) => void;
}

export function EditorChat({ pageContent, onApplyContent }: EditorChatProps) {
  const { messages, sendMessage, isStreaming, stopStreaming, clearMessages } = useAIChat();
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed, pageContent);
  };

  // Extract markdown content from AI response
  const extractContent = (content: string): string | null => {
    const match = content.match(/```(?:md|mdx|markdown)?\s*\n([\s\S]*?)```/);
    return match?.[1] ?? null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">Chat</span>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">
              Ask me to modify this dashboard.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              e.g. "Add a churn rate chart"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <AIChatMessage role={msg.role} content={msg.content} />
            {msg.role === "assistant" && !isStreaming && extractContent(msg.content) && (
              <div className="mt-1.5">
                <button
                  onClick={() => onApplyContent(extractContent(msg.content)!)}
                  className="text-[11px] px-2 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  Edit Page
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-3 py-2 border-t border-border shrink-0">
        <div className="flex gap-2 items-end bg-accent rounded-lg px-2 py-1.5">
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
              className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 rounded p-1 bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EditorChat.tsx src/ai/useAIChat.ts src/dev/api-middleware.ts
git commit -m "feat: add EditorChat with page context support"
```

---

### Task 7: Create `RightPanel` component

**Files:**
- Create: `src/components/editor/RightPanel.tsx`

- [ ] **Step 1: Create the tabbed right panel**

```typescript
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
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border shrink-0">
        {(["chat", "schema"] as RightTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded transition-colors capitalize",
              activeTab === tab
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {tab === "chat" ? "Chat" : "Schema"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "chat" && (
          <EditorChat pageContent={pageContent} onApplyContent={onApplyContent} />
        )}
        {activeTab === "schema" && (
          <SchemaProvider>
            <SchemaExplorer />
          </SchemaProvider>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/RightPanel.tsx
git commit -m "feat: add RightPanel with Chat/Schema tabs"
```

---

### Task 8: Create `DashboardEditor` orchestrator

**Files:**
- Create: `src/app/DashboardEditor.tsx`

- [ ] **Step 1: Create the three-panel editor**

```typescript
import React, { useState, useCallback } from "react";
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
  const [editorVisible, setEditorVisible] = useState(true);

  const handleApplyContent = useCallback((content: string) => {
    editor.setContent(content);
  }, [editor]);

  const handleSave = useCallback(async () => {
    try {
      await editor.save();
    } catch (err) {
      console.error("[polaris] Save failed:", err);
    }
  }, [editor]);

  if (editor.loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  if (editor.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-red-400 text-sm">
          {editor.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Editor panel (left) */}
      {editorVisible && (
        <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-card">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-xs font-semibold text-foreground">Editor</span>
            <div className="flex items-center gap-2">
              {editor.isDirty && (
                <>
                  <button
                    onClick={editor.revert}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Revert
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={editor.saving}
                    className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {editor.saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
              {!editor.isDirty && (
                <span className="text-[10px] text-muted-foreground">Saved</span>
              )}
            </div>
          </div>
          {/* CodeMirror */}
          <div className="flex-1 min-h-0">
            <MarkdownEditor value={editor.content} onChange={editor.setContent} />
          </div>
        </div>
      )}

      {/* Preview panel (center) */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorVisible(!editorVisible)}
              className={cn(
                "text-[11px] px-2 py-1 rounded transition-colors",
                editorVisible ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
              )}
            >
              Editor
            </button>
            <span className="text-xs text-muted-foreground">Preview</span>
          </div>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={cn(
              "text-[11px] px-2 py-1 rounded transition-colors",
              rightPanelOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {rightPanelOpen ? "Hide Panel" : "Chat / Schema"}
          </button>
        </div>
        <DashboardPreview key={pagePath} content={editor.content} />
      </div>

      {/* Right panel (chat / schema) */}
      {rightPanelOpen && (
        <div className="w-[320px] shrink-0 border-l border-border">
          <RightPanel pageContent={editor.content} onApplyContent={handleApplyContent} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/DashboardEditor.tsx
git commit -m "feat: add DashboardEditor three-panel orchestrator"
```

---

### Task 9: Wire into App.tsx and update Header

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Update Header — remove Chat and Builder modes**

In `src/components/Header.tsx`, change the `AppMode` type and `NAV_ITEMS`:

```typescript
export type AppMode = "dashboards" | "schema";

const NAV_ITEMS: { mode: AppMode; label: string; devOnly: boolean }[] = [
  { mode: "dashboards", label: "Dashboards", devOnly: false },
  { mode: "schema", label: "Schema", devOnly: true },
];
```

- [ ] **Step 2: Update App.tsx — use DashboardEditor**

Replace the dashboards mode rendering and remove chat/builder modes:

```typescript
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

    if (isStatic && hasWasm) {
      return new LazyWasmEngine();
    }

    if (isStatic) {
      return {
        executeQuery: async () => {
          throw new Error("No query engine available in static-only mode");
        },
      };
    }

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
        {/* Header */}
        <Header
          activeMode={activeMode}
          onModeChange={setActiveMode}
          isStatic={isStatic}
          onMobileMenuToggle={() => setSidebarOpen(true)}
        />

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — only in dashboards mode */}
          {activeMode === "dashboards" && (
            <Sidebar
              currentPage={currentPage}
              onNavigate={navigateTo}
              mobileOpen={sidebarOpen}
              onMobileClose={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {activeMode === "dashboards" && !isStatic && (
              <DashboardEditor key={currentPage} pagePath={currentPage} />
            )}

            {activeMode === "dashboards" && isStatic && (
              <div className="mx-auto max-w-[1200px] px-6 py-8 overflow-y-auto h-full">
                {/* Static mode: use DashboardPreview or keep DashboardPage */}
                <DashboardEditor key={currentPage} pagePath={currentPage} />
              </div>
            )}

            {activeMode === "schema" && (
              <SchemaProvider>
                <SchemaExplorer />
              </SchemaProvider>
            )}
          </main>
        </div>
      </div>
    </EngineProvider>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```
Expected: all existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/components/Header.tsx
git commit -m "feat: wire DashboardEditor into app, remove standalone Chat/Builder modes"
```

---

### Task 10: Keyboard shortcuts and polish

**Files:**
- Modify: `src/app/DashboardEditor.tsx`
- Modify: `src/components/editor/MarkdownEditor.tsx`

- [ ] **Step 1: Add Cmd+S save shortcut to MarkdownEditor**

In `MarkdownEditor.tsx`, add a custom keymap before the default keymap:

```typescript
import { Prec } from "@codemirror/state";

// In the component, accept an onSave prop:
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

// In the extensions array, add:
Prec.highest(keymap.of([
  {
    key: "Mod-s",
    run: () => {
      onSaveRef.current?.();
      return true;
    },
  },
])),
```

Add a ref for onSave:
```typescript
const onSaveRef = useRef(onSave);
onSaveRef.current = onSave;
```

- [ ] **Step 2: Pass onSave from DashboardEditor**

In `DashboardEditor.tsx`, pass the save handler:

```typescript
<MarkdownEditor value={editor.content} onChange={editor.setContent} onSave={handleSave} />
```

- [ ] **Step 3: Also handle Cmd+S on the window level for the preview panel**

In `DashboardEditor.tsx`, add a global keydown handler:

```typescript
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
```

- [ ] **Step 4: Verify TypeScript compiles and tests pass**

```bash
npx tsc --noEmit && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/app/DashboardEditor.tsx src/components/editor/MarkdownEditor.tsx
git commit -m "feat: add Cmd+S save shortcut and editor polish"
```

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 1 | CodeMirror dependencies | package.json |
| 2 | Save API endpoint | api-middleware.ts |
| 3 | Editor state + localStorage drafts | useEditorState.ts |
| 4 | CodeMirror markdown editor | MarkdownEditor.tsx |
| 5 | Live preview component | DashboardPreview.tsx |
| 6 | Editor-aware chat panel | EditorChat.tsx, useAIChat.ts |
| 7 | Right panel with Chat/Schema tabs | RightPanel.tsx |
| 8 | Three-panel editor orchestrator | DashboardEditor.tsx |
| 9 | Wire into App + update Header | App.tsx, Header.tsx |
| 10 | Keyboard shortcuts + polish | DashboardEditor.tsx, MarkdownEditor.tsx |
