import React, { useEffect, useRef, useState } from 'react'
import { useQueryEngine } from '@/engine/EngineContext'
import { parseDocument } from '@/engine/parser'
import { compileMDX } from '@/engine/mdx-compiler'
import { QueryProvider, mdxComponents } from '@/components/mdx'
import type { SQLQueryBlock } from '@/types/document'

interface DashboardPreviewProps {
  content: string
  format?: 'md' | 'yaml'
}

type QueryResults = Record<string, Record<string, unknown>[]>

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MdxContent, setMdxContent] = useState<React.ComponentType<any> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!content.trim()) {
      setMdxContent(null)
      setQueryResults({})
      setQueryErrors({})
      setError(null)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      let cancelled = false

      async function process() {
        setLoading(true)
        setError(null)
        setMdxContent(null)
        setQueryResults({})
        setQueryErrors({})

        try {
          const doc = parseDocument(content)
          if (cancelled) return

          const sqlQueries = doc.queries.filter(
            (q): q is SQLQueryBlock => q.type === 'sql'
          )

          const errors: Record<string, string> = {}
          const results = await Promise.all(
            sqlQueries.map(async (q) => {
              try {
                const result = await engine.executeQuery(q.sql)
                return [q.name, result.rows] as [string, Record<string, unknown>[]]
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[polaris] Query "${q.name}" failed:`, err)
                errors[q.name] = message
                return [q.name, [] as Record<string, unknown>[]] as [
                  string,
                  Record<string, unknown>[],
                ]
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
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

      process()

      return () => {
        cancelled = true
      }
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [content, format, engine])

  if (!content.trim()) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Loading preview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-red-400 text-sm max-w-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!MdxContent) {
    return null
  }

  return (
    <QueryProvider results={queryResults}>
      <div className="mdx-content space-y-6 px-6 py-8 max-w-[1200px] mx-auto">
        <QueryErrorBanner errors={queryErrors} />
        <MdxContent components={mdxComponents} />
      </div>
    </QueryProvider>
  )
}
