import { auth } from '@/auth'
import prisma from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

type PaymentAdminUser = {
  id: string
  firstname: string | null
  surname: string | null
  email: string | null
  phoneNumber: string | null
  isPaymentAdmin: boolean
}

function parseAllowlist(...values: Array<string | undefined>) {
  return values
    .flatMap((value) => value?.split(',') ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function isEnvAllowlisted(user: PaymentAdminUser) {
  const adminIds = parseAllowlist(
    process.env.HATCHLOG_PAYMENT_ADMIN_USER_IDS,
    process.env.PAYMENT_ADMIN_USER_IDS,
  )
  const adminEmails = parseAllowlist(
    process.env.HATCHLOG_PAYMENT_ADMIN_EMAILS,
    process.env.PAYMENT_ADMIN_EMAILS,
  ).map(normalize)
  const adminPhones = parseAllowlist(
    process.env.HATCHLOG_PAYMENT_ADMIN_PHONES,
    process.env.PAYMENT_ADMIN_PHONES,
  )

  return (
    adminIds.includes(user.id) ||
    adminEmails.includes(normalize(user.email)) ||
    adminPhones.includes(user.phoneNumber ?? '')
  )
}

function isPaymentAdmin(user: PaymentAdminUser) {
  return user.isPaymentAdmin || isEnvAllowlisted(user)
}

async function getSessionUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstname: true,
      surname: true,
      email: true,
      phoneNumber: true,
      isPaymentAdmin: true,
    },
  })
}

export async function requirePaymentAdminPage() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login?callbackUrl=/admin/payments')
  }

  if (!isPaymentAdmin(user)) {
    notFound()
  }

  return user
}

export async function requirePaymentAdminAction() {
  const user = await getSessionUser()
  if (!user || !isPaymentAdmin(user)) {
    throw new Error('Unauthorized payment admin request')
  }

  return user
}

