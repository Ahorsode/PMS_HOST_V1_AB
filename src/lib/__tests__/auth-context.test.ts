import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
  isStaffMemberLocked: vi.fn(),
}))

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T,>(fn: T) => fn,
}))
vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ default: { user: { findUnique: mocks.userFindUnique } } }))
vi.mock('@/lib/subscription-utils', () => ({ isStaffMemberLocked: mocks.isStaffMemberLocked }))

import { getAuthContext } from '@/lib/auth-utils'

function sessionFor(activeFarmId: string) {
  return { user: { id: 'user-1', activeFarmId, sessionVersion: 1 } }
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    role: 'MANAGER',
    sessionVersion: 1,
    securityNotice: null,
    farms: [],
    memberships: [],
    userPermissions: [],
    ...overrides,
  }
}

describe('getAuthContext farm access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaffMemberLocked.mockResolvedValue(false)
  })

  it('does not grant a removed member access to their old farm', async () => {
    mocks.auth.mockResolvedValue(sessionFor('victim-farm'))
    mocks.userFindUnique.mockResolvedValue(userRow())

    const context = await getAuthContext()

    expect(context.activeFarmId).toBeUndefined()
    expect(context.isFarmOwner).toBe(false)
  })

  it('falls back to a farm the user still belongs to', async () => {
    mocks.auth.mockResolvedValue(sessionFor('victim-farm'))
    mocks.userFindUnique.mockResolvedValue(
      userRow({ memberships: [{ farmId: 'other-farm', role: 'WORKER' }] }),
    )

    const context = await getAuthContext()

    expect(context.activeFarmId).toBe('other-farm')
    expect(context.role).toBe('WORKER')
  })

  it('keeps the session farm for current members and owners', async () => {
    mocks.auth.mockResolvedValue(sessionFor('farm-a'))
    mocks.userFindUnique.mockResolvedValue(
      userRow({ farms: [{ id: 'farm-b' }], memberships: [{ farmId: 'farm-a', role: 'MANAGER' }] }),
    )

    const context = await getAuthContext()

    expect(context.activeFarmId).toBe('farm-a')
    expect(context.role).toBe('MANAGER')
  })

  it('removes farm access from staff locked out by the plan', async () => {
    mocks.auth.mockResolvedValue(sessionFor('farm-a'))
    mocks.userFindUnique.mockResolvedValue(
      userRow({ memberships: [{ farmId: 'farm-a', role: 'WORKER' }] }),
    )
    mocks.isStaffMemberLocked.mockResolvedValue(true)

    const context = await getAuthContext()

    expect(context.activeFarmId).toBeUndefined()
    expect(mocks.isStaffMemberLocked).toHaveBeenCalledWith('farm-a', 'user-1')
  })

  it('never locks owners out of their own farm', async () => {
    mocks.auth.mockResolvedValue(sessionFor('farm-b'))
    mocks.userFindUnique.mockResolvedValue(userRow({ farms: [{ id: 'farm-b' }] }))
    mocks.isStaffMemberLocked.mockResolvedValue(true)

    const context = await getAuthContext()

    expect(context.activeFarmId).toBe('farm-b')
    expect(mocks.isStaffMemberLocked).not.toHaveBeenCalled()
  })
})
