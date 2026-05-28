import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { normalizeHardwareFingerprint } from '@/lib/license-token'
import { getRequestUserId } from '@/lib/request-auth'

const requestSchema = z.object({
  hardware_id: z.string().trim().min(6, 'hardware_id is required'),
})

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export async function POST(request: Request) {
  try {
    const userId = await getRequestUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const parsed = requestSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    const hardwareId = normalizeHardwareFingerprint(parsed.data.hardware_id)
    const now = new Date()

    const registration = await prisma.deviceRegistration.findFirst({
      where: {
        hardwareId,
      },
      include: {
        farm: {
          select: {
            id: true,
            userId: true,
            members: {
              where: { userId },
              select: { userId: true },
              take: 1,
            },
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Device registration not found' }, { status: 404 })
    }

    const hasFarmAccess =
      registration.farm.userId === userId || registration.farm.members.length > 0
    if (!hasFarmAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (registration.graceRescueUsedAt) {
      return NextResponse.json(
        {
          error_code: 'RESCUE_ALREADY_USED',
          error: 'This hardware ID has already used its 10-day rescue frame.',
        },
        { status: 409 },
      )
    }

    const isOfflineLocked =
      registration.status === 'EXPIRED' ||
      !!(registration.licenseExpiresAt && registration.licenseExpiresAt < now)

    if (!isOfflineLocked) {
      return NextResponse.json(
        {
          error_code: 'RESCUE_NOT_ALLOWED',
          error: 'Device is not currently in an offline-locked state.',
        },
        { status: 409 },
      )
    }

    const expiresAt = addDays(now, 10)
    const updated = await prisma.deviceRegistration.update({
      where: { id: registration.id },
      data: {
        userId: registration.userId ?? userId,
        status: 'GRACE_PERIOD',
        licenseExpiresAt: expiresAt,
        graceRescueUsedAt: now,
        isActive: true,
      },
      select: {
        id: true,
        status: true,
        licenseExpiresAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      registration_id: updated.id,
      license_status: updated.status,
      license_expires_at: updated.licenseExpiresAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('[POST /api/licenses/device/rescue]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
