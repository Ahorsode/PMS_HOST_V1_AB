import { describe, expect, it, vi } from 'vitest'
import { supplierBelongsToFarm } from './supplier-ownership'

function clientWith(result: { id: string } | null) {
  return { supplier: { findFirst: vi.fn().mockResolvedValue(result) } }
}

describe('supplierBelongsToFarm', () => {
  it('allows requests without a supplier', async () => {
    const tx = clientWith(null)
    await expect(supplierBelongsToFarm(tx, 'farm-a', undefined)).resolves.toBe(true)
    expect(tx.supplier.findFirst).not.toHaveBeenCalled()
  })

  it('scopes the lookup to the active farm', async () => {
    const tx = clientWith({ id: 'sup-1' })
    await expect(supplierBelongsToFarm(tx, 'farm-a', 'sup-1')).resolves.toBe(true)
    expect(tx.supplier.findFirst).toHaveBeenCalledWith({ where: { id: 'sup-1', farmId: 'farm-a' }, select: { id: true } })
  })

  it("rejects another farm's supplier", async () => {
    await expect(supplierBelongsToFarm(clientWith(null), 'farm-a', 'sup-of-farm-b')).resolves.toBe(false)
  })
})
