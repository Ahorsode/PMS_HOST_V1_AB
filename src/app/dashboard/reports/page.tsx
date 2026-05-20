import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from '@/lib/actions/staff-actions'
import { generateComprehensiveFarmReport } from '@/lib/actions/reports'
import { ReportsClient } from './ReportsClient'

export default async function ReportsPage() {
  const { activeFarmId } = await getAuthContext()
  if (!activeFarmId) {
    redirect('/dashboard')
  }

  const hasAccess = await checkWorkerPermissions('finance', 'view')
  if (!hasAccess) {
    redirect('/dashboard/unauthorized')
  }

  // Default to past 30 days
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)

  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  const report = await generateComprehensiveFarmReport(activeFarmId, start, end)

  if (!report) {
    return (
      <div className="p-8 text-center text-rose-400 font-bold uppercase border border-rose-500/20 bg-rose-500/10 rounded-xl">
        Failed to fetch farm data. Please ensure the farm is correctly initialized.
      </div>
    )
  }

  // Client callback server-action wrapper
  async function fetchReport(s: string, e: string) {
    'use server'
    const { activeFarmId: currentFarmId } = await getAuthContext()
    if (!currentFarmId) return null
    return await generateComprehensiveFarmReport(currentFarmId, new Date(s), new Date(e))
  }

  return (
    <div className="p-5 max-w-7xl mx-auto animate-in fade-in duration-700">
      <ReportsClient initialReport={report} onDateChange={fetchReport} />
    </div>
  )
}
