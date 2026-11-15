'use client'

import { createContext, useContext, type ReactNode } from 'react'

const MaintenanceContext = createContext<string | null>(null)

/**
 * Carries the maintenance notice (admin System settings) to client code under
 * the dashboard, e.g. the error screen shown when a save is refused. Server
 * action error messages are hidden in production, so the reason has to come
 * from here rather than from the error itself.
 */
export function MaintenanceProvider({ message, children }: { message: string | null; children: ReactNode }) {
  return <MaintenanceContext.Provider value={message}>{children}</MaintenanceContext.Provider>
}

/** The maintenance notice while maintenance mode is on, otherwise null. */
export function useMaintenanceMessage() {
  return useContext(MaintenanceContext)
}
