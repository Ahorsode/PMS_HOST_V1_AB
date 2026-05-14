'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function getInsertLogs() {
  const { role, activeFarmId } = await getAuthContext()
  if (!activeFarmId || (role !== 'OWNER' && role !== 'MANAGER')) return []

  return await prisma.insertLog.findMany({
    where: { farmId: activeFarmId },
    include: {
      user: {
        select: {
          firstname: true,
          surname: true,
          role: true
        }
      }
    },
    orderBy: { insertedAt: 'desc' },
    take: 100
  })
}

export async function getDeleteLogs() {
  const { role, activeFarmId } = await getAuthContext()
  if (!activeFarmId || (role !== 'OWNER' && role !== 'MANAGER')) return []

  return await prisma.deleteLog.findMany({
    where: { farmId: activeFarmId },
    include: {
      user: {
        select: {
          firstname: true,
          surname: true,
          role: true
        }
      }
    },
    orderBy: { deletedAt: 'desc' },
    take: 100
  })
}

export async function restoreDeletedRecord(logId: number) {
  const { userId, role, activeFarmId } = await getAuthContext()
  if (!activeFarmId || role !== 'OWNER') {
    return { success: false, error: 'Unauthorized: Only Owners can restore data' }
  }

  try {
    const log = await prisma.deleteLog.findUnique({
      where: { id: logId, farmId: activeFarmId }
    })

    if (!log) return { success: false, error: 'Log entry not found' }

    // Parse CSV data
    const rows = log.deletedDataCsv.split('\n')
    if (rows.length < 2) return { success: false, error: 'Invalid log data format' }

    const headers = rows[0].split('|')
    const values = rows[1].split('|')

    const record: any = {}
    headers.forEach((header, i) => {
      let cleanHeader = header.trim().replace(/^"|"$/g, '')
      let val: any = values[i] ? values[i].trim() : null
      
      if (val) {
        // Strip single quotes from quote_literal and unescape doubled single quotes
        val = val.replace(/^'|'$/g, '').replace(/''/g, "'")
      }

      if (val === 'NULL' || val === '' || val === 'null' || val === null) {
        val = null
      } else if (!isNaN(val) && val !== '' && !val.includes('-')) {
        // Simple numeric check, avoid dates being converted to numbers if possible
        // But Prisma handles types well if we provide strings for some
        val = Number(val)
      } else if (val === 'true') {
        val = true
      } else if (val === 'false') {
        val = false
      }
      
      record[cleanHeader] = val
    })

    // Remove ID to let DB generate a new one if it's a serial, 
    // or keep it if we want exact restoration.
    // However, if we keep ID and it's already taken, it will fail.
    // Most tables use Auto-increment ID.
    const { id, ...dataToRestore } = record

    // Handle farmId and userId to ensure context
    dataToRestore.farmId = activeFarmId
    dataToRestore.userId = userId // Mark restorer as current user? Or keep original?
    // User probably wants original data back.

    await (prisma as any)[log.tableName].create({
      data: dataToRestore
    })

    // Optionally delete the log entry after restoration
    // await prisma.deleteLog.delete({ where: { id: logId } })

    revalidatePath('/dashboard/admin/logs')
    return { success: true, message: `Successfully restored record to ${log.tableName}` }
  } catch (error: any) {
    console.error('Restoration error:', error)
    return { success: false, error: `Failed to restore: ${error.message}` }
  }
}
