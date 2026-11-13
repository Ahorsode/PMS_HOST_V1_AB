"use client";

import React, { useEffect, useState } from 'react';
import { createOrder } from '@/lib/actions/order-actions';
import { toast } from 'sonner';
import { AlertTriangle, Banknote, Calendar, ChevronLeft, ChevronRight, Lock, Plus, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react';
import {
  defaultEggInventoryRow,
  eggSizeLabelFromRow,
  isUnsortedEggInventory,
  requiresEggSizeSelection,
  type EggAllocationMode,
  type EggBatchStockOption,
} from '@/lib/egg-sale-allocation-utils';
import { toLocalDateTimeInputValue } from '@/lib/financial-dates';
import { QuickAddCustomerButton, type SaleCustomer } from './QuickAddCustomerButton';
import {
  computeItemGiveawayDiscount,
  computeLineDiscount,
  formatEggStockCrateLabel,
  saleQuantityInEggs,
  saleQuantityWithGiveaway,
  saleUnitPriceForDisplay,
  type EggSaleQuantityUnit,
  type LineDiscountType,
} from '@/lib/sale-quantity-utils';
import {
  SALE_PAYMENT_METHOD_OPTIONS,
  validateSalePaymentFields,
  type SalePaymentMethod,
} from '@/lib/sale-payment-utils';
import { useMoney } from '@/components/providers/CurrencyProvider'

type ProductType = 'inventory' | 'livestock' | 'custom';

interface SaleItemState {
  productType: ProductType;
  productId: string;
  description: string;
  quantity: number | '';
  unitPrice: number | '';
  eggAllocationMode?: EggAllocationMode;
  eggBatchId?: string;
  eggQuantityUnit?: EggSaleQuantityUnit;
  lineDiscountAmount?: number | '';
  lineDiscountType?: LineDiscountType;
}

interface SalesFormProps {
  customers: any[];
  inventory: any[];
  eggInventory: any[];
  eggBatchStock?: EggBatchStockOption[];
  fifoEggAvailability?: { totalEggs: number; byCategoryId: Record<string, number> };
  livestock: any[];
  eggsPerCrate?: number;
  onSuccess: () => void;
  initialLivestockId?: string;
  canOverridePrice?: boolean;
  canAddCustomer?: boolean;
  allowBatchOverride?: boolean;
  allowWorkerDiscounts?: boolean;
  defaultDiscountType?: LineDiscountType;
}

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getEggCatalogSalePrice(item: any) {
  return Number(item?.sellingPrice ?? item?.eggCategory?.sellingPrice ?? 0);
}

function resolveEggDisplayUnitPrice(
  item: any,
  eggQuantityUnit: EggSaleQuantityUnit,
  eggsPerCrate: number,
) {
  const catalogPrice = getEggCatalogSalePrice(item);
  if (catalogPrice <= 0) return '';
  return saleUnitPriceForDisplay(catalogPrice, eggQuantityUnit, eggsPerCrate);
}

function getBatchBasePrice(batch: any) {
  const initialCost = Number(batch?.initialCostActual ?? batch?.initial_actual_cost ?? 0);
  const initialCount = Number(batch?.initialCount ?? 0);
  return initialCost > 0 && initialCount > 0 ? toMoney(initialCost / initialCount) : 0;
}

function getInitialItem(
  livestock: any[],
  eggInventory: any[],
  initialLivestockId?: string,
  eggsPerCrate = 30,
): SaleItemState {
  const batch = initialLivestockId ? livestock.find((item) => item.id === initialLivestockId) : null;

  if (batch) {
    return {
      productType: 'livestock',
      productId: batch.id,
      description: batch.batchName || 'Livestock Sale',
      quantity: 1,
      unitPrice: getBatchBasePrice(batch)
    };
  }

  if (eggInventory.length > 0) {
    const entry = defaultEggInventoryRow(eggInventory);
    return {
      productType: 'inventory',
      productId: entry?.id ?? '',
      description: entry?.itemName || 'Eggs',
      quantity: 1,
      unitPrice: resolveEggDisplayUnitPrice(entry, 'crate', eggsPerCrate) || 0,
      eggAllocationMode: 'fifo',
      eggQuantityUnit: 'crate',
      lineDiscountAmount: 0,
      lineDiscountType: 'flat',
    };
  }

  if (livestock.length === 1) {
    const entry = livestock[0];
    return {
      productType: 'livestock',
      productId: entry.id,
      description: entry.batchName || 'Livestock Sale',
      quantity: 1,
      unitPrice: getBatchBasePrice(entry)
    };
  }

  return {
    productType: 'inventory',
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 0
  };
}

function shouldHideProductPicker(
  item: SaleItemState,
  eggInventory: any[],
  livestock: any[],
) {
  if (item.productType === 'custom') {
    return false;
  }
  const catalog = item.productType === 'inventory' ? eggInventory : livestock;
  if (catalog.length === 0) {
    return false;
  }
  if (catalog.length === 1) {
    return true;
  }
  return false;
}

function buildAutoSelectedProduct(
  productType: ProductType,
  eggInventory: any[],
  livestock: any[],
  eggsPerCrate = 30,
): Pick<SaleItemState, 'productId' | 'description' | 'unitPrice' | 'eggAllocationMode' | 'eggBatchId'> {
  if (productType === 'custom') {
    return {
      productId: '',
      description: 'Custom sale item',
      unitPrice: 0,
    };
  }

  if (productType === 'inventory') {
    const entry = defaultEggInventoryRow(eggInventory);
    return {
      productId: requiresEggSizeSelection(eggInventory) ? '' : (entry?.id ?? ''),
      description: entry?.itemName || 'Eggs',
      unitPrice: entry
        ? (resolveEggDisplayUnitPrice(entry, 'crate', eggsPerCrate) || 0)
        : 0,
      eggAllocationMode: 'fifo',
      eggBatchId: undefined,
    };
  }

  const catalog = livestock;
  if (catalog.length === 0) {
    return { productId: '', description: '', unitPrice: 0 };
  }

  const shouldAutoSelect = catalog.length === 1;
  if (!shouldAutoSelect) {
    return { productId: '', description: '', unitPrice: 0 };
  }

  const entry = catalog[0];
  return {
    productId: entry.id,
    description: entry.batchName || 'Livestock Sale',
    unitPrice: getBatchBasePrice(entry),
  };
}

function getEggAvailable(
  item: SaleItemState,
  eggInventory: any[],
  eggBatchStock: EggBatchStockOption[],
  fifoEggAvailability: { totalEggs: number; byCategoryId: Record<string, number> },
) {
  if (item.eggAllocationMode === 'batch') {
    const batch = eggBatchStock.find((row) => row.batchId === item.eggBatchId);
    return Number(batch?.eggsRemaining ?? 0);
  }
  const selected = eggInventory.find((entry: any) => entry.id === item.productId);
  if (isUnsortedEggInventory(selected)) {
    return Number(fifoEggAvailability.totalEggs ?? 0);
  }
  const categoryId = selected?.eggCategory?.id ?? selected?.eggCategoryId;
  if (categoryId && fifoEggAvailability.byCategoryId[String(categoryId)] != null) {
    return Number(fifoEggAvailability.byCategoryId[String(categoryId)]);
  }
  return Number(fifoEggAvailability.totalEggs ?? 0);
}

export function SalesForm({
  customers,
  inventory,
  eggInventory,
  eggBatchStock = [],
  fifoEggAvailability = { totalEggs: 0, byCategoryId: {} },
  livestock,
  eggsPerCrate = 30,
  onSuccess,
  initialLivestockId,
  canOverridePrice = false,
  canAddCustomer = true,
  allowBatchOverride = false,
  allowWorkerDiscounts = false,
  defaultDiscountType = 'item',
}: SalesFormProps) {
  const money = useMoney()
  const [items, setItems] = useState<SaleItemState[]>(() => [
    getInitialItem(livestock, eggInventory, initialLivestockId, eggsPerCrate),
  ]);
  const [sizePickerIndex, setSizePickerIndex] = useState<number | null>(null);
  const [customerOptions, setCustomerOptions] = useState<SaleCustomer[]>(
    () => customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
  );
  const [discountValue, setDiscountValue] = useState<number | ''>(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [totalCashReceived, setTotalCashReceived] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(() => toLocalDateTimeInputValue());
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAccountName, setPaymentAccountName] = useState('');
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);

  const isWalkIn = customerId === '';
  const isCreditSale = paymentMethod === 'CREDIT';
  const showBatchToggle = allowBatchOverride || canOverridePrice;
  const showDiscountSection = canOverridePrice || allowWorkerDiscounts;

  const resolveLineDiscountType = (item: SaleItemState): LineDiscountType => {
    if (canOverridePrice) {
      return item.lineDiscountType ?? 'flat';
    }
    return defaultDiscountType;
  };

  const getInventoryRow = (item: SaleItemState) =>
    eggInventory.find((entry: any) => entry.id === item.productId);

  const getItemCatalogPrice = (item: SaleItemState) => {
    if (item.productType !== 'inventory') return 0;
    return getEggCatalogSalePrice(getInventoryRow(item));
  };

  const getItemBasePrice = (item: SaleItemState) => {
    if (item.productType === 'inventory') {
      return getItemCatalogPrice(item);
    }
    if (item.productType === 'livestock') {
      return getBatchBasePrice(livestock.find((entry: any) => entry.id === item.productId));
    }
    return Number(item.unitPrice || 0);
  };

  const getEffectiveUnitPrice = (item: SaleItemState) => {
    const basePrice = getItemBasePrice(item);
    if (item.productType === 'inventory') {
      const catalogPrice = getItemCatalogPrice(item);
      if (!canOverridePrice && catalogPrice > 0) {
        return saleUnitPriceForDisplay(catalogPrice, 'crate', eggsPerCrate);
      }
      if (canOverridePrice && catalogPrice > 0) {
        return Number(
          item.unitPrice
            || saleUnitPriceForDisplay(catalogPrice, 'crate', eggsPerCrate)
            || 0,
        );
      }
      return Number(item.unitPrice || 0);
    }
    if (canOverridePrice) {
      return Number(item.unitPrice || basePrice || 0);
    }
    if (basePrice > 0) {
      return basePrice;
    }
    return Number(item.unitPrice || 0);
  };

  const getLineSubtotal = (item: SaleItemState) =>
    Number(item.quantity || 0) * getEffectiveUnitPrice(item);

  const getGiveawayQuantity = (item: SaleItemState) => {
    if (resolveLineDiscountType(item) !== 'item') return 0;
    return Math.max(0, Number(item.lineDiscountAmount || 0));
  };

  const getLineDiscount = (item: SaleItemState) => {
    const discountType = resolveLineDiscountType(item);
    const discountInput = Number(item.lineDiscountAmount || 0);
    // Item giveaway is additive free stock — it does not reduce the billed line total.
    if (discountType === 'item') return 0;
    return computeLineDiscount(
      getLineSubtotal(item),
      discountInput,
      discountType === 'percent' ? 'percent' : 'flat',
    );
  };

  const getLineTotal = (item: SaleItemState) =>
    toMoney(Math.max(getLineSubtotal(item) - getLineDiscount(item), 0));

  const updateItem = (index: number, patch: Partial<SaleItemState>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updateProductType = (index: number, productType: ProductType) => {
    updateItem(index, {
      productType,
      ...buildAutoSelectedProduct(productType, eggInventory, livestock, eggsPerCrate),
    });
  };

  const updateProduct = (index: number, productId: string) => {
    const item = items[index];
    if (!item) return;

    if (item.productType === 'inventory') {
      const selected = eggInventory.find((entry: any) => entry.id === productId);
      updateItem(index, {
        productId,
        description: selected?.itemName || '',
        unitPrice: resolveEggDisplayUnitPrice(
          selected,
          'crate',
          eggsPerCrate,
        ) || 0,
      });
      return;
    }

    if (item.productType === 'livestock') {
      const selected = livestock.find((entry: any) => entry.id === productId);
      updateItem(index, {
        productId,
        description: selected?.batchName || '',
        unitPrice: getBatchBasePrice(selected)
      });
    }
  };

  const selectEggSize = (index: number, entry: any) => {
    updateItem(index, {
      productId: entry.id,
      description: entry.itemName || 'Eggs',
      unitPrice: resolveEggDisplayUnitPrice(
        entry,
        'crate',
        eggsPerCrate,
      ) || 0,
    });
    setSizePickerIndex(null);
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      buildAutoSelectedProduct('inventory', eggInventory, livestock, eggsPerCrate).productId
        ? {
            productType: 'inventory',
            quantity: 1,
            ...buildAutoSelectedProduct('inventory', eggInventory, livestock, eggsPerCrate),
          }
        : getInitialItem(livestock, eggInventory, initialLivestockId),
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const subtotal = toMoney(items.reduce((sum, item) => sum + getLineTotal(item), 0));
  const calculatedDiscount = canOverridePrice
    ? toMoney(discountType === 'percent' ? (subtotal * (Number(discountValue || 0) / 100)) : Number(discountValue || 0))
    : 0;
  const total = toMoney(Math.max(subtotal - calculatedDiscount, 0));
  const cashValue = totalCashReceived === '' ? NaN : Number(totalCashReceived);
  const cashBalances = Number.isFinite(cashValue) && Math.abs(toMoney(cashValue) - total) <= 0.01;

  useEffect(() => {
    if (!isWalkIn && !isCreditSale) return;
    setTotalCashReceived(total);
  }, [isWalkIn, isCreditSale, total]);

  const step1Errors = items.flatMap((item) => {
    const errors: string[] = [];
    const quantity = Number(item.quantity || 0);
    const basePrice = getItemBasePrice(item);

    if (!item.description.trim()) errors.push('Select a product');
    if (!Number.isInteger(quantity) || quantity <= 0) errors.push('Quantity must be a whole number');

    const giveawayQty = showDiscountSection ? getGiveawayQuantity(item) : 0;
    if (giveawayQty > 0 && !Number.isInteger(giveawayQty)) {
      errors.push('Giveaway quantity must be a whole number');
    }
    const stockQuantity = saleQuantityWithGiveaway(quantity, giveawayQty);

    if (item.productType === 'inventory') {
      if (eggInventory.length === 0) errors.push('No egg products available');
      if (!item.productId) errors.push('Select an egg size');
      if (showBatchToggle && item.eggAllocationMode === 'batch' && !item.eggBatchId) {
        errors.push('Select a batch for egg sale');
      }
      const available = getEggAvailable(item, eggInventory, eggBatchStock, fifoEggAvailability);
      const quantityEggs = saleQuantityInEggs(
        stockQuantity,
        'crate',
        eggsPerCrate,
      );
      if (quantityEggs > available) {
        errors.push(
          item.eggAllocationMode === 'batch'
            ? `Selected batch only has ${formatEggStockCrateLabel(available, eggsPerCrate)} available`
            : `${item.description || 'Eggs'} only has ${formatEggStockCrateLabel(available, eggsPerCrate)} available`,
        );
      }
    }

    if (item.productType === 'livestock') {
      const selected = livestock.find((entry: any) => entry.id === item.productId);
      if (!selected) errors.push('Livestock batch is required');
      if (selected && stockQuantity > Number(selected.currentCount)) {
        errors.push(`${selected.batchName} only has ${selected.currentCount} birds available`);
      }
    }

    if (!canOverridePrice && item.productType === 'custom') errors.push('Custom items require manager access');

    if (getEffectiveUnitPrice(item) <= 0) {
      if (item.productType === 'inventory' && getItemCatalogPrice(item) <= 0) {
        errors.push('Enter a sale price for this egg item');
      } else if (item.productType === 'livestock' && basePrice <= 0) {
        errors.push(`${item.description || 'Livestock'} needs a configured base sale price before you can sell it`);
      } else {
        errors.push('Unit price must be greater than zero');
      }
    }

    if (showDiscountSection) {
      const lineSubtotal = getLineSubtotal(item);
      const discountType = resolveLineDiscountType(item);
      if (discountType !== 'item' && getLineDiscount(item) > lineSubtotal) {
        errors.push('Line discount cannot exceed line subtotal');
      }
    }

    return errors;
  });

  if (!saleDate || Number.isNaN(new Date(saleDate).getTime())) {
    step1Errors.push('Choose a valid sale date and time');
  }

  const paymentErrors = validateSalePaymentFields({
    paymentMethod,
    paymentReference,
    paymentAccountName,
    customerId: customerId || undefined,
  });

  const step2Errors = [...paymentErrors];
  if (canOverridePrice && calculatedDiscount > subtotal) {
    step2Errors.push('Discount cannot exceed the line subtotal');
  }
  if (!isCreditSale && !isWalkIn && !canOverridePrice && total > 0 && totalCashReceived !== '' && !cashBalances) {
    step2Errors.push('Cash received must equal the locked sale total');
  }

  const canContinueStep1 = step1Errors.length === 0 && subtotal > 0;
  const outstandingBalance = toMoney(Math.max(total - (Number.isFinite(cashValue) ? cashValue : 0), 0));
  const needsCompletionPrompt = isCreditSale || outstandingBalance > 0.01;

  const canSubmit = step2Errors.length === 0
    && total > 0
    && Number.isFinite(cashValue)
    && cashValue >= 0
    && (isWalkIn ? cashBalances : (isCreditSale || canOverridePrice || cashBalances))
    && !isSubmitting;

  const hasAnyLockedLine = items.some((item) => {
    const catalogPrice = getItemCatalogPrice(item);
    const basePrice = getItemBasePrice(item);
    return (item.productType === 'inventory' && catalogPrice > 0)
      || (item.productType === 'livestock' && basePrice > 0);
  });

  const submitOrder = async (completeNow?: boolean) => {
    setIsSubmitting(true);
    const response = await createOrder({
      customerId: customerId || undefined,
      discountAmount: calculatedDiscount,
      totalCashReceived: cashValue,
      orderDate: saleDate,
      paymentMethod,
      paymentReference: paymentReference || undefined,
      paymentAccountName: paymentAccountName || undefined,
      completeNow,
      items: items.map((item) => {
        const discountType = resolveLineDiscountType(item);
        const discountInput = Number(item.lineDiscountAmount || 0);
        const unitPrice = getEffectiveUnitPrice(item);
        const paidQuantity = Number(item.quantity) || 0;
        const giveawayQty = showDiscountSection && discountType === 'item'
          ? Math.max(0, discountInput)
          : 0;
        // Stock leaves for paid + free crates; customer is billed for paid only.
        const quantity = saleQuantityWithGiveaway(paidQuantity, giveawayQty);
        const lineDiscountAmount = discountType === 'item'
          ? toMoney(computeItemGiveawayDiscount(giveawayQty, unitPrice))
          : discountInput;

        return {
          description: item.description,
          quantity,
          unitPrice,
          inventoryId: item.productType === 'inventory' ? item.productId : undefined,
          livestockId: item.productType === 'livestock' ? item.productId : undefined,
          eggAllocationMode: item.productType === 'inventory'
            ? (showBatchToggle ? item.eggAllocationMode : 'fifo')
            : undefined,
          eggBatchId: item.productType === 'inventory' && item.eggAllocationMode === 'batch'
            ? item.eggBatchId
            : undefined,
          eggQuantityUnit: item.productType === 'inventory' ? 'crate' : undefined,
          lineDiscountAmount: showDiscountSection ? lineDiscountAmount : 0,
          lineDiscountType: showDiscountSection ? discountType : 'flat',
        };
      })
    });
    setIsSubmitting(false);
    setCompletionDialogOpen(false);

    if (response.success) {
      toast.success(completeNow === false && needsCompletionPrompt
        ? 'Sale saved. Complete it later from the sales list.'
        : 'Farm-gate sale logged successfully');
      setSaleDate(toLocalDateTimeInputValue());
      onSuccess();
    } else {
      toast.error((response as any).error || 'Failed to record sale');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (needsCompletionPrompt) {
      setCompletionDialogOpen(true);
      return;
    }

    await submitOrder();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 overflow-hidden">
      <div className="flex flex-nowrap gap-2 overflow-x-auto">
        {[
          { key: 1 as const, label: 'Customer & products' },
          { key: 2 as const, label: 'Payment & discounts' },
        ].map((wizardStep) => (
          <div
            key={wizardStep.key}
            className={`rounded-lg border px-3 py-1 text-xs font-medium ${
              step === wizardStep.key
                ? 'border-fg/[0.08] bg-fg/[0.04] text-accent'
                : step > wizardStep.key
                  ? 'border-fg/15 bg-fg/[0.04] text-fg/60'
                  : 'border-fg/10 bg-fg/[0.02] text-fg/35'
            }`}
          >
            {wizardStep.key}. {wizardStep.label}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 min-w-0">
          <label className="px-1 text-xs font-medium text-fg/90">Customer</label>
          <div className="flex items-center gap-2 sm:block sm:space-y-2">
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none transition-colors focus:border-fg/[0.08] sm:w-full"
            >
              <option value="" className="bg-card">Walk-in customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id} className="bg-card">{customer.name}</option>
              ))}
            </select>
            {canAddCustomer ? (
              <QuickAddCustomerButton
                onCreated={(customer) => {
                  setCustomerOptions((current) => {
                    if (current.some((row) => row.id === customer.id)) return current
                    return [...current, customer].sort((a, b) => a.name.localeCompare(b.name))
                  })
                  setCustomerId(customer.id)
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0 sm:block sm:space-y-2">
          <label className="flex shrink-0 items-center gap-1 px-1 text-xs font-medium text-fg/90">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-fg-3" />
            Sale date & time
          </label>
          <input
            type="datetime-local"
            required
            value={saleDate}
            onChange={(event) => setSaleDate(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none transition-colors focus:border-fg/[0.08] sm:w-full"
          />
        </div>
      </div>

      {(canOverridePrice || hasAnyLockedLine) ? (
      <div className="rounded-md border border-fg/[0.08] bg-fg/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-fg">
            {canOverridePrice ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
            {canOverridePrice ? 'Manager controls' : 'Locked pricing'}
          </div>
          <p className="text-2xl font-medium text-fg">{money.format(total)}</p>
        </div>
      </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <label className="text-xs font-medium text-fg/90">Sale lines</label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs font-medium text-fg transition-colors hover:text-fg"
          >
            <Plus className="h-3 w-3" /> Add line
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const basePrice = getItemBasePrice(item);
            const catalogPrice = getItemCatalogPrice(item);
            const effectivePrice = getEffectiveUnitPrice(item);
            const lineSubtotal = getLineSubtotal(item);
            const lineTotal = getLineTotal(item);
            const giveawayQty = showDiscountSection ? getGiveawayQuantity(item) : 0;
            const isPriceLocked = !canOverridePrice && (
              (item.productType === 'inventory' && catalogPrice > 0)
              || (item.productType === 'livestock' && basePrice > 0)
            );

            return (
              <div key={index} className="overflow-hidden rounded-md border border-fg/10 bg-fg/5 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-fg/50">Type</label>
                    <select
                      value={item.productType}
                      onChange={(event) => updateProductType(index, event.target.value as ProductType)}
                      className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                    >
                      <option value="inventory">Eggs</option>
                      <option value="livestock">Birds</option>
                      {canOverridePrice && <option value="custom">Custom</option>}
                    </select>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-fg/50">Product</label>
                    {item.productType === 'custom' ? (
                      <input
                        value={item.description}
                        onChange={(event) => updateItem(index, { description: event.target.value })}
                        className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                      />
                    ) : item.productType === 'inventory' && eggInventory.length === 0 ? (
                      <div className="flex h-11 min-w-0 items-center rounded-md border border-fg/[0.08] bg-fg/[0.04] px-3 text-sm font-medium text-fg">
                        No eggs in stock — log egg production first
                      </div>
                    ) : item.productType === 'inventory' ? (
                      <div className="space-y-2">
                        {showBatchToggle ? (
                          <div className="flex min-w-0 overflow-hidden rounded-md border border-fg/10 bg-card">
                            <button
                              type="button"
                              onClick={() => updateItem(index, { eggAllocationMode: 'fifo', eggBatchId: undefined })}
                              className={`flex-1 px-3 py-2 text-xs font-medium ${item.eggAllocationMode !== 'batch' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg/60'}`}
                            >
                              FIFO
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItem(index, { eggAllocationMode: 'batch' })}
                              className={`flex-1 px-3 py-2 text-xs font-medium ${item.eggAllocationMode === 'batch' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg/60'}`}
                            >
                              By batch
                            </button>
                          </div>
                        ) : null}
                        {showBatchToggle && item.eggAllocationMode === 'batch' ? (
                          eggBatchStock.length === 0 ? (
                            <div className="rounded-md border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-sm font-medium text-fg">
                              No active layer batches with eggs in stock
                            </div>
                          ) : (
                            <select
                              value={item.eggBatchId ?? ''}
                              onChange={(event) => updateItem(index, { eggBatchId: event.target.value })}
                              className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                            >
                              <option value="" className="bg-card">Select batch</option>
                              {eggBatchStock.map((batch) => (
                                <option key={batch.batchId} value={batch.batchId} className="bg-card">
                                  {batch.batchName} ({Math.floor(batch.eggsRemaining / eggsPerCrate)} crates, {batch.eggsRemaining % eggsPerCrate} eggs remaining)
                                </option>
                              ))}
                            </select>
                          )
                        ) : null}
                        {requiresEggSizeSelection(eggInventory) ? (
                          <button
                            type="button"
                            onClick={() => setSizePickerIndex(index)}
                            className="flex h-11 w-full items-center justify-between rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg transition-colors hover:border-fg/[0.08]"
                          >
                            <span>{item.productId ? `Size: ${eggSizeLabelFromRow(eggInventory.find((entry: any) => entry.id === item.productId))}` : 'Select egg size'}</span>
                            <span className="text-xs text-fg">Choose</span>
                          </button>
                        ) : (
                          <div className="flex h-11 min-w-0 items-center rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg">
                            {item.description || 'Eggs'}
                            {' '}
                            ({formatEggStockCrateLabel(
                              getEggAvailable(item, eggInventory, eggBatchStock, fifoEggAvailability),
                              eggsPerCrate,
                            )})
                          </div>
                        )}
                      </div>
                    ) : shouldHideProductPicker(item, eggInventory, livestock) ? (
                      <div className="flex h-11 min-w-0 items-center rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg">
                        {item.description || 'Livestock batch'}
                      </div>
                    ) : (
                      <select
                        value={item.productId}
                        onChange={(event) => updateProduct(index, event.target.value)}
                        className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                      >
                        <option value="" className="bg-card">Select product</option>
                        {livestock.map((entry: any) => (
                          <option key={entry.id} value={entry.id} className="bg-card">
                            {`${entry.batchName} (${entry.currentCount} birds)`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-medium text-fg/50">
                        {item.productType === 'inventory' ? 'Crates sold' : 'Quantity sold'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, { quantity: event.target.value === '' ? '' : Number(event.target.value) })}
                        className="h-14 w-full min-w-0 rounded-md border border-fg/10 bg-card px-4 text-base font-medium text-fg outline-none transition-colors focus:border-fg/[0.08]"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-medium text-fg/50">
                        {item.productType === 'inventory' ? 'Price / Crate' : 'Unit Price'}
                      </label>
                      <div className="relative min-w-0">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-fg">{money.symbol}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={isPriceLocked ? effectivePrice : item.unitPrice}
                          onChange={(event) => updateItem(index, { unitPrice: event.target.value === '' ? '' : Number(event.target.value) })}
                          disabled={isPriceLocked}
                          className="box-border h-14 w-full min-w-0 rounded-md border border-fg/10 bg-card py-0 pl-11 pr-10 text-base font-medium text-fg outline-none transition-colors focus:border-fg/[0.08] disabled:cursor-not-allowed disabled:bg-card disabled:text-fg/60"
                        />
                        {isPriceLocked && <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg/30" />}
                      </div>
                      {item.productType === 'inventory' && catalogPrice <= 0 && (
                        <p className="text-xs text-fg mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          No catalog price — enter the sale price.
                        </p>
                      )}
                    </div>

                    <div className="hidden items-end md:flex md:justify-end">
                      <button aria-label="Remove line"
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        title="Remove line"
                        className="h-14 w-14 shrink-0 rounded-md border border-transparent text-fg/60 transition-colors hover:border-fg/[0.08] hover:bg-fg/[0.04] hover:text-neg disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {showDiscountSection ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                    {canOverridePrice ? (
                      <>
                        <div className="space-y-1 min-w-0">
                          <label className="text-xs font-medium text-fg/50">
                            {(item.lineDiscountType ?? 'flat') === 'item' ? 'Extra free crates (on top)' : 'Line Discount'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step={(item.lineDiscountType ?? 'flat') === 'item' ? '1' : '0.01'}
                            value={item.lineDiscountAmount ?? 0}
                            onChange={(event) => updateItem(index, { lineDiscountAmount: event.target.value === '' ? '' : Number(event.target.value) })}
                            className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <label className="text-xs font-medium text-fg/50">Type</label>
                          <select
                            value={item.lineDiscountType ?? 'flat'}
                            onChange={(event) => updateItem(index, { lineDiscountType: event.target.value as LineDiscountType })}
                            className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                          >
                            <option value="flat" className="bg-card">{money.currency}</option>
                            <option value="percent" className="bg-card">%</option>
                            <option value="item" className="bg-card">Giveaway</option>
                          </select>
                        </div>
                      </>
                    ) : defaultDiscountType === 'item' ? (
                      <div className="space-y-1 min-w-0 sm:col-span-2">
                        <label className="text-xs font-medium text-fg/50">
                          Extra free crates (on top)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.lineDiscountAmount ?? 0}
                          onChange={(event) => updateItem(index, { lineDiscountAmount: event.target.value === '' ? '' : Number(event.target.value) })}
                          className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                        />
                      </div>
                    ) : defaultDiscountType === 'percent' ? (
                      <div className="space-y-1 min-w-0 sm:col-span-2">
                        <label className="text-xs font-medium text-fg/50">Line discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.lineDiscountAmount ?? 0}
                          onChange={(event) => updateItem(index, { lineDiscountAmount: event.target.value === '' ? '' : Number(event.target.value) })}
                          className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1 min-w-0 sm:col-span-2">
                        <label className="text-xs font-medium text-fg/50">Line discount ({money.currency})</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.lineDiscountAmount ?? 0}
                          onChange={(event) => updateItem(index, { lineDiscountAmount: event.target.value === '' ? '' : Number(event.target.value) })}
                          className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-card px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
                        />
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-fg/10 pt-3">
                  <span className="text-xs font-medium text-fg/50">
                    Base: {money.format(basePrice)} | Subtotal: {money.format(lineSubtotal)}
                    {giveawayQty > 0
                      ? ` | +${giveawayQty} free ${giveawayQty === 1 ? 'crate' : 'crates'}`
                      : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button aria-label="Remove line"
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      title="Remove line"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-fg/60 transition-colors hover:border-fg/[0.08] hover:bg-fg/[0.04] hover:text-neg disabled:cursor-not-allowed disabled:opacity-30 md:hidden"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-fg">Line total: {money.format(lineTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {step1Errors.length > 0 && (
        <div className="rounded-md border border-fg/[0.08] bg-fg/[0.04] px-4 py-3 text-sm font-medium text-fg">
          {step1Errors[0]}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-fg/10 bg-fg/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-fg/50">Line subtotal</p>
          <p className="text-lg font-medium text-fg">{money.format(subtotal)}</p>
        </div>
        <button
          type="button"
          disabled={!canContinueStep1}
          onClick={() => setStep(2)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 text-[11px] font-medium text-accent-fg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
        </>
      ) : (
        <>
      {canOverridePrice && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
          <div className="space-y-2 min-w-0">
            <label className="px-1 text-xs font-medium text-fg/90">Discount</label>
            <div className="flex min-w-0 overflow-hidden rounded-md border border-fg/10 bg-fg/5">
              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`shrink-0 border-r border-fg/10 px-4 py-3 text-xs font-medium transition-colors ${discountType === 'flat' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg/60'}`}
              >
                {money.currency}
              </button>
              <button aria-label="Percentage discount"
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`shrink-0 border-r border-fg/10 px-4 py-3 text-xs font-medium transition-colors ${discountType === 'percent' ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-fg/60'}`}
              >
                %
              </button>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value === '' ? '' : Number(event.target.value))}
                className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-fg outline-none"
              />
            </div>
          </div>
          <div className="rounded-md border border-fg/10 bg-fg/5 p-3 text-right">
            <p className="text-xs font-medium text-fg/50">Discount</p>
            <p className="text-xl font-medium text-fg">{money.format(calculatedDiscount)}</p>
          </div>
        </div>
      )}

      <div className="space-y-2 min-w-0">
        <label className="px-1 text-xs font-medium text-fg/90">Payment method</label>
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as SalePaymentMethod)}
          className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none transition-colors focus:border-fg/[0.08]"
        >
          {SALE_PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-card">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {paymentMethod === 'MOBILE_MONEY' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 min-w-0">
            <label className="px-1 text-xs font-medium text-fg/90">MoMo phone number</label>
            <input
              type="tel"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
              placeholder="e.g. 0241234567"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <label className="px-1 text-xs font-medium text-fg/90">Account holder name</label>
            <input
              type="text"
              value={paymentAccountName}
              onChange={(event) => setPaymentAccountName(event.target.value)}
              className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
              placeholder="Name on MoMo account"
            />
          </div>
        </div>
      ) : paymentMethod === 'BANK_TRANSFER' ? (
        <div className="space-y-2 min-w-0">
          <label className="px-1 text-xs font-medium text-fg/90">Bank reference (optional)</label>
          <input
            type="text"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            className="h-11 w-full min-w-0 rounded-md border border-fg/10 bg-fg/10 px-3 text-sm font-medium text-fg outline-none focus:border-fg/[0.08]"
            placeholder="Transfer reference"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-2 min-w-0">
          <label className="px-1 text-xs font-medium text-fg/90">Total cash received ({money.currency})</label>
          <div className="relative min-w-0">
            <Banknote className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-3" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              readOnly={isWalkIn}
              value={totalCashReceived}
              onChange={(event) => {
                if (isWalkIn) return;
                setTotalCashReceived(event.target.value === '' ? '' : Number(event.target.value));
              }}
              className={`box-border h-14 w-full min-w-0 rounded-md border bg-card pl-12 pr-4 text-xl font-medium text-fg outline-none transition-colors focus:border-emerald-500/60 sm:text-2xl ${
                !isCreditSale && !isWalkIn && !canOverridePrice && totalCashReceived !== '' && !cashBalances ? 'border-red-500/60' : 'border-fg/10'
              }`}
            />
          </div>
        </div>

        <div className={`min-w-0 rounded-md border p-4 ${!isCreditSale && !isWalkIn && !canOverridePrice && totalCashReceived !== '' && !cashBalances ? 'border-fg/[0.08] bg-fg/[0.04]' : 'border-fg/[0.08] bg-fg/[0.04]'}`}>
          <p className="text-xs font-medium text-fg/50">Balance check</p>
          <div className="mt-2 flex items-start gap-2">
            {!isCreditSale && !isWalkIn && !canOverridePrice && totalCashReceived !== '' && !cashBalances ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-neg" />
            ) : (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-fg-3" />
            )}
            <span className={`text-sm font-medium leading-snug ${!isCreditSale && !isWalkIn && !canOverridePrice && totalCashReceived !== '' && !cashBalances ? 'text-neg' : 'text-accent'}`}>
              {isCreditSale
                ? 'Credit sale: partial or zero payment allowed for saved customers'
                : isWalkIn
                ? 'Walk-in sale: cash is locked to the sale total'
                : canOverridePrice
                  ? 'Credit sale: override audit enabled'
                  : cashBalances
                    ? 'Cash matches total'
                    : 'Awaiting exact cash total'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-fg/10 bg-fg/5 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-fg/50">Subtotal</p>
            <p className="font-medium text-fg">{money.format(subtotal)}</p>
          </div>
          {calculatedDiscount > 0 ? (
            <div>
              <p className="text-xs font-medium text-fg/50">Discount</p>
              <p className="font-medium text-fg">- {money.format(calculatedDiscount)}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium text-fg/50">Total</p>
            <p className="font-medium text-fg">{money.format(total)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-fg/50">Outstanding</p>
            <p className="font-medium text-fg">{money.format(Math.max(total - (Number.isFinite(cashValue) ? cashValue : 0), 0))}</p>
          </div>
        </div>
      </div>

      {step2Errors.length > 0 && (
        <div className="rounded-md border border-fg/[0.08] bg-fg/[0.04] px-4 py-3 text-sm font-medium text-fg">
          {step2Errors[0]}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-fg/10 px-5 text-[11px] font-medium text-fg/80 hover:bg-fg/5"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fg px-5 text-sm font-medium text-page transition-[background-color,transform] duration-150 hover:bg-fg/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCart className="h-4 w-4" />
          {isSubmitting ? 'Processing...' : 'Record Sale'}
        </button>
      </div>
        </>
      )}

      {completionDialogOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4 pb-safe">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar pb-safe rounded-md border border-fg/10 bg-card p-5">
            <h3 className="text-lg font-medium text-fg">Complete this sale now?</h3>
            <p className="mt-2 text-sm text-fg/70">
              This credit or partial-payment sale can be completed now to deduct stock and finalize fulfillment, or saved to complete later.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => submitOrder(false)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md border border-fg/10 px-4 text-xs font-medium text-fg/80 hover:bg-fg/5 disabled:opacity-50"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => submitOrder(true)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-500 px-4 text-xs font-medium text-accent-fg disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Complete sale now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sizePickerIndex !== null ? (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4 pb-safe">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar pb-safe rounded-md border border-fg/10 bg-card p-4">
            <h3 className="text-lg font-medium text-fg">Select egg size</h3>
            <div className="mt-3 space-y-2">
              {eggInventory.map((entry: any) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectEggSize(sizePickerIndex, entry)}
                  className="flex w-full items-center justify-between rounded-md border border-fg/10 bg-fg/5 px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:border-fg/[0.08] hover:bg-fg/[0.04]"
                >
                  <span>{eggSizeLabelFromRow(entry)}</span>
                  <span className="text-xs text-fg/60">
                    {formatEggStockCrateLabel(Number(entry.stockLevel), eggsPerCrate)} in stock
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSizePickerIndex(null)}
              className="mt-4 w-full rounded-md border border-fg/10 px-4 py-2 text-sm font-medium text-fg/70 hover:bg-fg/5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
