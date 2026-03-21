import React from 'react'

interface DashboardPageProps {
  pagePath?: string
  onTitleChange?: (title: string) => void
}

/**
 * TODO: Reimplement with YAML config parser.
 * Previously orchestrated: fetch MDX -> parse -> execute queries -> compile MDX -> render.
 * New flow will be: load YAML config -> execute queries -> render VegaChart components.
 */
export function DashboardPage({ pagePath = 'index', onTitleChange }: DashboardPageProps) {
  React.useEffect(() => {
    onTitleChange?.(`Dashboard: ${pagePath}`)
  }, [pagePath, onTitleChange])

  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <p>Dashboard rendering is being migrated to YAML config + Vega-Lite.</p>
    </div>
  )
}
