type SupplierLookupClient = {
  supplier: {
    findFirst(args: { where: { id: string; farmId: string }; select: { id: true } }): Promise<{ id: string } | null>
  }
}

/**
 * Supplier ids arrive from the client, so check they belong to the active
 * farm before linking or updating them (SEC-06). Returns true when no
 * supplier was given.
 */
export async function supplierBelongsToFarm(
  tx: SupplierLookupClient,
  farmId: string,
  supplierId: string | null | undefined,
) {
  if (!supplierId) return true
  const supplier = await tx.supplier.findFirst({
    where: { id: supplierId, farmId },
    select: { id: true },
  })
  return !!supplier
}
