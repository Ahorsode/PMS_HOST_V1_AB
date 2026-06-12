import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { normalizeHardwareFingerprint } from '@/lib/license-token'
import { checkRateLimit, rateLimitHeaders } from '@/lib/performance/rate-limit'

const requestSchema = z
  .object({
    farm_id: z.string().trim().optional(),
    farmId: z.string().trim().optional(),
    input_farm_id: z.string().trim().optional(),
    activation_key: z.string().trim().optional(),
    activationKey: z.string().trim().optional(),
    input_activation_key: z.string().trim().optional(),
    hardware_id: z.string().trim().optional(),
    hardwareId: z.string().trim().optional(),
    system_guid: z.string().trim().optional(),
    systemGuid: z.string().trim().optional(),
    input_hardware_id: z.string().trim().optional(),
    device_name: z.string().trim().min(1).max(120).optional(),
    deviceName: z.string().trim().min(1).max(120).optional(),
    device_type: z.string().trim().min(1).max(60).optional(),
    deviceType: z.string().trim().min(1).max(60).optional(),
  })
  .transform((value) => ({
    farmId: value.input_farm_id || value.farm_id || value.farmId || '',
    activationKey: value.input_activation_key || value.activation_key || value.activationKey || '',
    hardwareId:
      value.input_hardware_id ||
      value.hardware_id ||
      value.hardwareId ||
      value.system_guid ||
      value.systemGuid ||
      '',
    deviceName: value.device_name || value.deviceName || 'Flutter Desktop',
    deviceType: value.device_type || value.deviceType || 'Desktop',
  }))
  .superRefine((value, ctx) => {
    if (!value.farmId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['farm_id'],
        message: 'farm_id is required',
      })
    }

    if (!value.activationKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activation_key'],
        message: 'activation_key is required',
      })
    }

    if (!value.hardwareId || value.hardwareId.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hardware_id'],
        message: 'hardware_id is required',
      })
    }
  })

type ActivationVerificationRow = {
  success: boolean
  confirmation_code: string | null
  registration_id: string | null
  farm_id: string | null
  license_status: string | null
  license_expires_at: Date | null
  error_code: string | null
  error: string | null
}

function statusForErrorCode(errorCode: string | null) {
  switch (errorCode) {
    case 'FARM_ID_REQUIRED':
    case 'ACTIVATION_KEY_REQUIRED':
    case 'HARDWARE_ID_REQUIRED':
      return 400
    case 'INVALID_ACTIVATION_KEY':
      return 404
    case 'ACTIVATION_KEY_USED':
    case 'HARDWARE_ALREADY_REGISTERED':
      return 409
    default:
      return 400
  }
}

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
    const limit = await checkRateLimit({
      policy: 'license.activate',
      scope: 'device-activate',
      ip,
    })

    if (!limit.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many activation attempts. Please wait and try again.',
          code: 429,
          retryAfterSec: limit.retryAfterSec,
        },
        { status: 429, headers: rateLimitHeaders(limit) },
      )
    }

    const payload = await request.json()
    const parsed = requestSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    const hardwareId = normalizeHardwareFingerprint(parsed.data.hardwareId)
    const result = await prisma.$queryRaw<ActivationVerificationRow[]>`
      SELECT *
      FROM public.verify_desktop_activation_key(
        ${parsed.data.farmId},
        ${parsed.data.activationKey},
        ${hardwareId},
        ${parsed.data.deviceName},
        ${parsed.data.deviceType}
      )
    `

    const verification = result[0]
    if (!verification) {
      return NextResponse.json({ error: 'Activation verification failed' }, { status: 500 })
    }

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          error_code: verification.error_code,
          error: verification.error,
        },
        { status: statusForErrorCode(verification.error_code) },
      )
    }

    return NextResponse.json({
      success: true,
      confirmation_code: verification.confirmation_code,
      registration_id: verification.registration_id,
      farm_id: verification.farm_id,
      hardware_id: hardwareId,
      license_status: verification.license_status,
      license_expires_at: verification.license_expires_at?.toISOString() ?? null,
      next_step: 'CREATE_LOCAL_LOGIN',
    })
  } catch (error) {
    console.error('[POST /api/licenses/device/activate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
