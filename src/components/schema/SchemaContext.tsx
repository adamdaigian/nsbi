import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { SchemaMetadata } from "@/types/schema";

interface SchemaContextValue {
  schema: SchemaMetadata | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const SchemaContext = createContext<SchemaContextValue>({
  schema: null,
  loading: false,
  error: null,
  refresh: () => {},
});

export function useSchema() {
  return useContext(SchemaContext);
}

export function SchemaProvider({ children }: { children: React.ReactNode }) {
  const [schema, setSchema] = useState<SchemaMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schema");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || res.statusText);
      }
      const data = (await res.json()) as SchemaMetadata;
      setSchema(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SchemaContext.Provider value={{ schema, loading, error, refresh }}>
      {children}
    </SchemaContext.Provider>
  );
}
