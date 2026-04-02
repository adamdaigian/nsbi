import { useState, useEffect, useCallback, useRef } from "react";

const NEW_PAGE_TEMPLATE = "---\ntitle: New Page\n---\n\n";

function draftKey(pagePath: string): string {
  return `polaris-draft:${pagePath}`;
}

export interface EditorState {
  content: string;
  savedContent: string;
  isDirty: boolean;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setContent: (content: string) => void;
  save: () => Promise<void>;
  revert: () => void;
}

export function useEditorState(pagePath: string): EditorState {
  const [content, setContentState] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pagePathRef = useRef(pagePath);
  pagePathRef.current = pagePath;

  // Fetch page content on mount / when pagePath changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/page?path=${encodeURIComponent(pagePath)}`
        );

        let serverContent: string;

        if (res.status === 404) {
          serverContent = NEW_PAGE_TEMPLATE;
        } else if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error);
        } else {
          const body = (await res.json()) as { content: string };
          serverContent = body.content;
        }

        if (cancelled) return;

        // Check localStorage for a draft
        const draft = localStorage.getItem(draftKey(pagePath));

        if (draft != null && draft !== serverContent) {
          // Draft exists and differs from server -- use draft
          setContentState(draft);
        } else {
          // No draft, or draft matches saved -- use server content and clean up
          setContentState(serverContent);
          localStorage.removeItem(draftKey(pagePath));
        }

        setSavedContent(serverContent);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pagePath]);

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
    localStorage.setItem(draftKey(pagePathRef.current), newContent);
  }, []);

  const save = useCallback(async () => {
    const currentPath = pagePathRef.current;
    setSaving(true);
    try {
      const res = await fetch("/api/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, content }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }

      setSavedContent(content);
      localStorage.removeItem(draftKey(currentPath));
    } finally {
      setSaving(false);
    }
  }, [content]);

  const revert = useCallback(() => {
    setContentState(savedContent);
    localStorage.removeItem(draftKey(pagePathRef.current));
  }, [savedContent]);

  const isDirty = content !== savedContent;

  return {
    content,
    savedContent,
    isDirty,
    loading,
    error,
    saving,
    setContent,
    save,
    revert,
  };
}
