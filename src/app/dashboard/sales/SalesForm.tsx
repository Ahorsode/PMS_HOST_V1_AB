"use client";

import React, { useEffect, useState } from 'react';
import { createOrder } from '@/lib/actions/order-actions';
import { toast } from 'sonner';
import { Banknote, ChevronLeft, ChevronRight, Lock, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormField,
  FormNote,
  FormRow,
  FormSection,
  FormSteps,
  FormSummary,
  FormSummaryRow,
  Input,
  OptionCards,
  SearchSelect,
  Segmented,
  controlClass,
  fieldStyles,
} from '@/components/ui/form';
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

const SALE_STEPS = [
  { id: 'items', label: 'What was sold' },
  { id: 'payment', label: 'Payment' },
];

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
        : 'Sale recorded');
      setSaleDate(toLocalDateTimeInputValue());
      onSuccess();
    } else {
      toast.error((response as any).error || 'The sale could not be saved. Try again.');
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

  const cashMismatch = !isCreditSale && !isWalkIn && !canOverridePrice && totalCashReceived !== '' && !cashBalances;
  const outstanding = Math.max(total - (Number.isFinite(cashValue) ? cashValue : 0), 0);

  return (
    <Form onSubmit={handleSubmit} noValidate className="min-w-0">
      <FormSteps
        steps={SALE_STEPS}
        current={step - 1}
        onStepClick={(index) => {
          if (index === 0) setStep(1);
        }}
      />

      {step === 1 ? (
        <>
          <FormSection title="Who and when">
            <FormRow>
              <div className="min-w-0 space-y-2">
                <SearchSelect
                  label="Customer"
                  value={customerId}
                  onChange={setCustomerId}
                  options={[
                    { value: '', label: 'Walk-in customer', description: 'Pays the full amount now' },
                    ...customerOptions.map((customer) => ({ value: customer.id, label: customer.name })),
                  ]}
                  searchPlaceholder="Search customers"
                  emptyText="No customer matches"
                />
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
              <Input
                label="Date and time of sale"
                type="datetime-local"
                required
                value={saleDate}
                onChange={(event) => setSaleDate(event.target.value)}
              />
            </FormRow>
          </FormSection>

          <FormSection
            title="What was sold"
            hint={
              canOverridePrice
                ? 'You can change prices and give discounts.'
                : hasAnyLockedLine
                  ? 'Prices are set by the farm.'
                  : undefined
            }
          >
            <ul className="space-y-3">
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
                const isEggs = item.productType === 'inventory';
                const lineDiscountType = item.lineDiscountType ?? 'flat';

                return (
                  <li key={index} className="min-w-0 space-y-4 rounded-xl border border-fg/[0.08] bg-tile p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-fg">Item {index + 1}</p>
                      {items.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove item ${index + 1}`}
                          onClick={() => removeItem(index)}
                          className="-my-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-neg-solid/10 hover:text-neg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:h-10 md:w-10"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      ) : null}
                    </div>

                    <Segmented
                      label="Selling"
                      value={item.productType}
                      onChange={(value: ProductType) => updateProductType(index, value)}
                      options={[
                        { value: 'inventory', label: 'Eggs' },
                        { value: 'livestock', label: 'Birds' },
                        ...(canOverridePrice ? [{ value: 'custom' as ProductType, label: 'Other' }] : []),
                      ]}
                    />

                    {item.productType === 'custom' ? (
                      <Input
                        label="What is it"
                        placeholder="e.g. Manure, empty sacks"
                        value={item.description}
                        onChange={(event) => updateItem(index, { description: event.target.value })}
                      />
                    ) : isEggs && eggInventory.length === 0 ? (
                      <FormNote tone="warning">No eggs in stock. Record egg collection first.</FormNote>
                    ) : isEggs ? (
                      <>
                        {showBatchToggle ? (
                          <Segmented
                            label="Take eggs from"
                            value={item.eggAllocationMode === 'batch' ? 'batch' : 'fifo'}
                            onChange={(mode: 'fifo' | 'batch') =>
                              mode === 'batch'
                                ? updateItem(index, { eggAllocationMode: 'batch' })
                                : updateItem(index, { eggAllocationMode: 'fifo', eggBatchId: undefined })
                            }
                            options={[
                              { value: 'fifo', label: 'Oldest first' },
                              { value: 'batch', label: 'One flock' },
                            ]}
                          />
                        ) : null}
                        {showBatchToggle && item.eggAllocationMode === 'batch' ? (
                          eggBatchStock.length === 0 ? (
                            <FormNote tone="warning">No layer flock has eggs in stock.</FormNote>
                          ) : (
                            <SearchSelect
                              label="Flock"
                              value={item.eggBatchId ?? ''}
                              onChange={(eggBatchId) => updateItem(index, { eggBatchId })}
                              placeholder="Select a flock"
                              searchPlaceholder="Search flocks"
                              options={eggBatchStock.map((batch) => ({
                                value: batch.batchId,
                                label: batch.batchName,
                                description: `${Math.floor(batch.eggsRemaining / eggsPerCrate)} crates, ${batch.eggsRemaining % eggsPerCrate} eggs left`,
                              }))}
                            />
                          )
                        ) : null}
                        {requiresEggSizeSelection(eggInventory) ? (
                          <FormField label="Egg size">
                            {(field) => (
                              <button
                                {...field}
                                type="button"
                                onClick={() => setSizePickerIndex(index)}
                                className={controlClass(false, 'flex items-center justify-between gap-3 text-left')}
                              >
                                <span className={item.productId ? '' : 'text-fg-3'}>
                                  {item.productId
                                    ? eggSizeLabelFromRow(eggInventory.find((entry: any) => entry.id === item.productId))
                                    : 'Select egg size'}
                                </span>
                                <span className="text-sm font-medium text-accent">Choose</span>
                              </button>
                            )}
                          </FormField>
                        ) : (
                          <p className={fieldStyles.hint}>
                            {item.description || 'Eggs'}:{' '}
                            {formatEggStockCrateLabel(
                              getEggAvailable(item, eggInventory, eggBatchStock, fifoEggAvailability),
                              eggsPerCrate,
                            )}{' '}
                            in stock
                          </p>
                        )}
                      </>
                    ) : shouldHideProductPicker(item, eggInventory, livestock) ? (
                      <p className={fieldStyles.hint}>{item.description || 'Livestock batch'}</p>
                    ) : (
                      <SearchSelect
                        label="Flock"
                        value={item.productId}
                        onChange={(productId) => updateProduct(index, productId)}
                        placeholder="Select a flock"
                        searchPlaceholder="Search flocks"
                        options={livestock.map((entry: any) => ({
                          value: entry.id,
                          label: entry.batchName,
                          description: `${entry.currentCount} birds`,
                        }))}
                      />
                    )}

                    <FormRow alwaysInline>
                      <Input
                        label={isEggs ? 'Crates sold' : 'How many'}
                        type="number"
                        min="1"
                        step="1"
                        unit={isEggs ? 'crates' : item.productType === 'livestock' ? 'birds' : undefined}
                        value={item.quantity}
                        onChange={(event) => updateItem(index, { quantity: event.target.value === '' ? '' : Number(event.target.value) })}
                      />
                      <Input
                        label={isEggs ? 'Price per crate' : 'Price for one'}
                        type="number"
                        min="0"
                        step="0.01"
                        unit={isPriceLocked ? <Lock className="h-4 w-4" aria-label="Price is fixed" /> : money.currency}
                        value={isPriceLocked ? effectivePrice : item.unitPrice}
                        onChange={(event) => updateItem(index, { unitPrice: event.target.value === '' ? '' : Number(event.target.value) })}
                        disabled={isPriceLocked}
                        hint={isEggs && catalogPrice <= 0 ? 'No set price. Enter what you charged.' : undefined}
                      />
                    </FormRow>

                    {showDiscountSection ? (
                      canOverridePrice ? (
                        <FormRow>
                          <Segmented
                            label="Discount on this item"
                            value={lineDiscountType}
                            onChange={(value: LineDiscountType) => updateItem(index, { lineDiscountType: value })}
                            options={[
                              { value: 'flat', label: money.currency },
                              { value: 'percent', label: '%' },
                              { value: 'item', label: 'Free crates' },
                            ]}
                          />
                          <Input
                            label={lineDiscountType === 'item' ? 'Free crates on top' : 'Discount'}
                            type="number"
                            min="0"
                            step={lineDiscountType === 'item' ? '1' : '0.01'}
                            unit={lineDiscountType === 'item' ? 'crates' : lineDiscountType === 'percent' ? '%' : money.currency}
                            value={item.lineDiscountAmount ?? 0}
                            onChange={(event) => updateItem(index, { lineDiscountAmount: event.target.value === '' ? '' : Number(event.target.value) })}
                          />
                        </FormRow>
                      ) : (
                        <Input
                          label={defaultDiscountType === 'item' ? 'Free crates on top' : 'Discount on this item'}
                          type="number"
                          min="0"
                          step={defaultDiscountType === 'item' ? '1' : '0.01'}
                          unit={defaultDiscountType === 'item' ? 'crates' : defaultDiscountType === 'percent' ? '%' : money.currency}
                          value={item.lineDiscountAmount ?? 0}
                          onChange={(event) => updateItem(index, { lineDiscountAmount: event.target.value === '' ? '' : Number(event.target.value) })}
                        />
                      )
                    ) : null}

                    <FormSummary>
                      {basePrice > 0 && basePrice !== effectivePrice ? (
                        <FormSummaryRow label="Set price" value={money.format(basePrice)} />
                      ) : null}
                      <FormSummaryRow label="Before discount" value={money.format(lineSubtotal)} />
                      {giveawayQty > 0 ? (
                        <FormSummaryRow
                          label="Free on top"
                          value={`${giveawayQty} ${giveawayQty === 1 ? 'crate' : 'crates'}`}
                        />
                      ) : null}
                      <FormSummaryRow label="Item total" value={money.format(lineTotal)} strong />
                    </FormSummary>
                  </li>
                );
              })}
            </ul>

            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add another item
            </Button>
          </FormSection>

          {step1Errors.length > 0 ? <FormNote tone="warning">{step1Errors[0]}</FormNote> : null}

          <FormActions
            note={
              <span>
                Subtotal <span className="font-semibold tabular-nums text-fg">{money.format(subtotal)}</span>
              </span>
            }
          >
            <Button type="button" variant="accent" disabled={!canContinueStep1} onClick={() => setStep(2)}>
              Continue to payment
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </FormActions>
        </>
      ) : (
        <>
          <FormSection title="Payment">
            <Segmented
              label="How did they pay"
              value={paymentMethod}
              onChange={(value: SalePaymentMethod) => setPaymentMethod(value)}
              options={SALE_PAYMENT_METHOD_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value === 'MOBILE_MONEY' ? 'MoMo' : option.value === 'BANK_TRANSFER' ? 'Bank' : option.label,
              }))}
              hint={isCreditSale ? 'They can pay part now, or nothing, and the rest later.' : undefined}
            />

            {paymentMethod === 'MOBILE_MONEY' ? (
              <FormRow>
                <Input
                  label="MoMo number"
                  type="tel"
                  inputMode="tel"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="e.g. 0241234567"
                />
                <Input
                  label="Name on the MoMo account"
                  type="text"
                  value={paymentAccountName}
                  onChange={(event) => setPaymentAccountName(event.target.value)}
                  placeholder="e.g. Kofi Mensah"
                />
              </FormRow>
            ) : paymentMethod === 'BANK_TRANSFER' ? (
              <Input
                label="Bank reference"
                optional
                type="text"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="e.g. TRF-20391"
              />
            ) : null}

            {canOverridePrice ? (
              <FormRow>
                <Segmented
                  label="Discount on the whole sale"
                  value={discountType}
                  onChange={(value: 'flat' | 'percent') => setDiscountType(value)}
                  options={[
                    { value: 'flat', label: money.currency },
                    { value: 'percent', label: '%' },
                  ]}
                />
                <Input
                  label="Discount"
                  type="number"
                  min="0"
                  step="0.01"
                  unit={discountType === 'percent' ? '%' : money.currency}
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value === '' ? '' : Number(event.target.value))}
                />
              </FormRow>
            ) : null}

            <Input
              label="Money received"
              type="number"
              min="0"
              step="0.01"
              leading={<Banknote className="h-5 w-5" strokeWidth={1.5} />}
              unit={money.currency}
              readOnly={isWalkIn}
              value={totalCashReceived}
              onChange={(event) => {
                if (isWalkIn) return;
                setTotalCashReceived(event.target.value === '' ? '' : Number(event.target.value));
              }}
              className="text-lg font-semibold"
              error={cashMismatch ? `Enter exactly ${money.format(total)}, the sale total.` : undefined}
              hint={
                isCreditSale
                  ? 'Part payment is fine for a saved customer.'
                  : isWalkIn
                    ? 'A walk-in customer pays the full total.'
                    : canOverridePrice
                      ? 'You can record a different amount. It is noted for review.'
                      : cashBalances
                        ? 'Matches the total.'
                        : 'Enter the full total.'
              }
            />
          </FormSection>

          <FormSummary>
            <FormSummaryRow label="Subtotal" value={money.format(subtotal)} />
            {calculatedDiscount > 0 ? (
              <FormSummaryRow label="Discount" value={`− ${money.format(calculatedDiscount)}`} />
            ) : null}
            <FormSummaryRow label="Total" value={money.format(total)} strong />
            <FormSummaryRow
              label="Still to pay"
              value={money.format(outstanding)}
              tone={outstanding > 0 ? 'negative' : 'default'}
            />
          </FormSummary>

          {step2Errors.length > 0 ? <FormNote tone="warning">{step2Errors[0]}</FormNote> : null}

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Back
            </Button>
            <Button type="submit" variant="accent" disabled={!canSubmit} isLoading={isSubmitting} loadingText="Saving sale">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
              Record sale
            </Button>
          </FormActions>
        </>
      )}

      <Dialog
        isOpen={completionDialogOpen}
        onOpenChange={(open) => !open && !isSubmitting && setCompletionDialogOpen(false)}
        title="Hand over the goods now?"
        description="This sale is not fully paid. Complete it now to take the stock out, or save it and complete it later from the sales list."
        className="max-w-md"
      >
        <FormActions>
          <Button type="button" variant="outline" onClick={() => submitOrder(false)} disabled={isSubmitting}>
            Save for later
          </Button>
          <Button type="button" variant="accent" onClick={() => submitOrder(true)} isLoading={isSubmitting} loadingText="Saving">
            Complete now
          </Button>
        </FormActions>
      </Dialog>

      <Dialog
        isOpen={sizePickerIndex !== null}
        onOpenChange={(open) => !open && setSizePickerIndex(null)}
        title="Choose egg size"
        className="max-w-md"
      >
        <OptionCards
          aria-label="Egg size"
          cols={1}
          value={sizePickerIndex !== null ? items[sizePickerIndex]?.productId : undefined}
          onChange={(id: string) => {
            const entry = eggInventory.find((row: any) => row.id === id);
            if (entry && sizePickerIndex !== null) selectEggSize(sizePickerIndex, entry);
          }}
          options={eggInventory.map((entry: any) => ({
            value: entry.id,
            label: eggSizeLabelFromRow(entry),
            aside: `${formatEggStockCrateLabel(Number(entry.stockLevel), eggsPerCrate)} in stock`,
          }))}
        />
      </Dialog>
    </Form>
  );
}
