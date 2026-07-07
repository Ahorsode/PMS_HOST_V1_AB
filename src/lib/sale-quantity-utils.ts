export type EggSaleQuantityUnit = 'crate' | 'egg'

export const DEFAULT_EGGS_PER_CRATE = 30

export function saleQuantityInEggs(
  displayQuantity: number,
  unit: EggSaleQuantityUnit,
  eggsPerCrate = DEFAULT_EGGS_PER_CRATE,
) {
  if (displayQuantity <= 0) return 0
  return unit === 'crate' ? displayQuantity * eggsPerCrate : displayQuantity
}

export function saleUnitPriceForDisplay(
  catalogPricePerCrate: number,
  unit: EggSaleQuantityUnit,
  eggsPerCrate = DEFAULT_EGGS_PER_CRATE,
) {
  if (unit === 'crate') return catalogPricePerCrate
  return eggsPerCrate > 0 ? catalogPricePerCrate / eggsPerCrate : catalogPricePerCrate
}

export function saleUnitPricePerEgg(
  displayUnitPrice: number,
  unit: EggSaleQuantityUnit,
  eggsPerCrate = DEFAULT_EGGS_PER_CRATE,
) {
  if (unit === 'egg') return displayUnitPrice
  return eggsPerCrate > 0 ? displayUnitPrice / eggsPerCrate : displayUnitPrice
}

export function computeLineDiscount(
  lineSubtotal: number,
  discountAmount: number,
  discountType: 'flat' | 'percent' = 'flat',
) {
  if (lineSubtotal <= 0) return 0
  if (discountType === 'percent') {
    return Math.min(lineSubtotal, Math.max(0, (lineSubtotal * discountAmount) / 100))
  }
  return Math.min(lineSubtotal, Math.max(0, discountAmount))
}

export function formatEggStockCrateLabel(eggsInStock: number, eggsPerCrate = DEFAULT_EGGS_PER_CRATE) {
  if (eggsInStock <= 0) return '0 crates'
  const crates = Math.floor(eggsInStock / eggsPerCrate)
  const remainder = eggsInStock % eggsPerCrate
  const crateLabel = crates === 1 ? 'crate' : 'crates'
  if (remainder === 0) return `${crates} ${crateLabel}`
  const eggLabel = remainder === 1 ? 'egg' : 'eggs'
  return `${crates} ${crateLabel} (+${remainder} ${eggLabel})`
}
