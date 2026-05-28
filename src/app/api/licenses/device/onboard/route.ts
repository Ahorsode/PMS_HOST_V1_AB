import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { normalizeHardwareFingerprint } from '@/lib/license-token'
import { getRequestUserId } from '@/lib/request-auth'

const requestSchema = z
  .object({
    hardware_id: z.string().trim().optional(),
    hardwareId: z.string().trim().optional(),
    web_farm_id: z.string().trim().optional(),
    webFarmId: z.string().trim().optional(),
    farm_id: z.string().trim().optional(),
    farmId: z.string().trim().optional(),
    device_name: z.string().trim().min(1).max(120).optional(),
    deviceName: z.string().trim().min(1).max(120).optional(),
    device_type: z.string().trim().min(1).max(60).optional(),
    deviceType: z.string().trim().min(1).max(60).optional(),
  })
  .transform((value) => ({
    hardwareId: value.hardware_id || value.hardwareId || '',
    requestedFarmId: value.web_farm_id || value.webFarmId || value.farm_id || value.farmId || '',
    deviceName: value.device_name || value.deviceName,
    deviceType: value.device_type || value.deviceType,
  }))
  .superRefine((value, ctx) => {
    if (!value.hardwareId || value.hardwareId.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hardware_id'],
        message: 'hardware_id is required',
      })
    }
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

    const hardwareId = normalizeHardwareFingerprint(parsed.data.hardwareId)
    const requestedFarmId = parsed.data.requestedFarmId || null
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

    const farm = requestedFarmId
      ? await prisma.farm.findFirst({
          where: {
            id: requestedFarmId,
            OR: [{ userId }, { members: { some: { userId } } }],
          },
          select: { id: true },
        })
      : await prisma.farm.findFirst({
          where: {
            OR: [{ userId }, { members: { some: { userId } } }],
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })

    if (!farm) {
      return NextResponse.json(
        {
          error: 'Farm not found or not accessible',
          error_code: 'FARM_NOT_ACCESSIBLE',
        },
        { status: 404 },
      )
    }

    const registration = await prisma.deviceRegistration.create({
      data: {
        farmId: farm.id,
        userId,
        hardwareId,
        deviceId: hardwareId,
        deviceName: parsed.data.deviceName ?? 'Flutter Desktop',
        deviceType: parsed.data.deviceType ?? 'Desktop',
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
        farm_id: farm.id,
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
