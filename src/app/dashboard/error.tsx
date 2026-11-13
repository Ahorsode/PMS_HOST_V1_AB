'use client'

import { useEffect } from 'react'
import { useMaintenanceMessage } from '@/components/site/MaintenanceContext'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const maintenanceMessage = useMaintenanceMessage()

  useEffect(() => {
    console.error('[dashboard-error]', error)

    // After a new deploy, an open tab asks for code files that no longer exist.
    // A full reload fetches the new version; guard it so we never loop.
    const message = `${error?.name ?? ''} ${error?.message ?? ''}`
    const isStaleDeploy = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Failed to find Server Action/i.test(message)
    if (!isStaleDeploy) return
    try {
      const key = 'dashboard-stale-reload'
      const last = Number(sessionStorage.getItem(key) || 0)
      if (Date.now() - last < 30_000) return
      sessionStorage.setItem(key, String(Date.now()))
    } catch {
      // Storage blocked: still reload once; the error page shows if it recurs.
    }
    window.location.reload()
  }, [error])

  // While maintenance mode is on, saves are refused on purpose; say so plainly.
  if (maintenanceMessage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-12 text-fg">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-sm text-fg">Maintenance</p>
          <h2 className="text-2xl font-semibold">Changes are paused right now.</h2>
          <p className="text-sm text-fg/65">{maintenanceMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-page hover:bg-fg/90"
          >
            Back to the page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12 text-fg">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm text-fg">Dashboard error</p>
        <h2 className="text-2xl font-semibold">This dashboard view could not load.</h2>
        <p className="text-sm text-fg/65">Please retry the request.</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-page hover:bg-fg/90"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
