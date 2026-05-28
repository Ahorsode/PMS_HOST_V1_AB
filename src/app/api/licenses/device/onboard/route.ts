import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { normalizeHardwareFingerprint } from '@/lib/license-token'
import { getRequestUserId } from '@/lib/request-auth'

const requestSchema = z.object({
  hardware_id: z.string().trim().min(6, 'hardware_id is required'),
  web_farm_id: z.string().trim().min(1, 'web_farm_id is required'),
  device_name: z.string().trim().min(1).max(120).optional(),
  device_type: z.string().trim().min(1).max(60).optional(),
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
    const farmId = parsed.data.web_farm_id
    const now = new Date()
    const expiresAt = addDays(now, 30)

    const existingHardware = await prisma.deviceRegistration.findFirst({
      where: {
        hardwareId,
      },
      select: {
        id: true,
      },
    })

    if (existingHardware) {
      return NextResponse.json(
        {
          error_code: 'TRIAL_ALREADY_CLAIMED',
          error: 'Device has already claimed a free trial.',
        },
        { status: 409 },
      )
    }

    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    })

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found or not accessible' }, { status: 404 })
    }

    const registration = await prisma.deviceRegistration.create({
      data: {
        farmId: farm.id,
        userId,
        hardwareId,
        deviceId: hardwareId,
        deviceName: parsed.data.device_name ?? 'Flutter Desktop',
        deviceType: parsed.data.device_type ?? 'Desktop',
        status: 'CLOUD_TRIAL',
        licenseExpiresAt: expiresAt,
        isActive: true,
      },
      select: {
        id: true,
        licenseExpiresAt: true,
        status: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        registration_id: registration.id,
        license_status: registration.status,
        license_expires_at: registration.licenseExpiresAt?.toISOString() ?? null,
      },
      { status: 201 },
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        {
          error_code: 'TRIAL_ALREADY_CLAIMED',
          error: 'Device has already claimed a free trial.',
        },
        { status: 409 },
      )
    }

    console.error('[POST /api/licenses/device/onboard]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
