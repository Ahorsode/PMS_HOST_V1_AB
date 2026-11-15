'use client';

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormError,
  FormSteps,
  FormSummary,
  FormSummaryRow,
  Input,
} from '@/components/ui/form';
import { Syringe, Pill } from 'lucide-react';
import { setHealthItemCost, type MissingCostHealthItem } from '@/lib/actions/health-actions';
import { useRouter } from 'next/navigation';
import { useMoney } from '@/components/providers/CurrencyProvider'

interface Props {
  items: MissingCostHealthItem[];
}

/**
 * Prompts a finance-capable user to price vaccines/medications that workers
 * added without a cost. Skipping just closes the dialog — it is NOT persisted,
 * so it shows again every time finance is opened until the cost is recorded.
 */
export function MissingHealthCostPrompt({ items }: Props) {
  const money = useMoney()
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(items.length > 0);
  const [cost, setCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = items[index];
  if (!current || !isOpen) return null;

  const isVaccine = current.kind === 'VACCINE';
  const numericCost = Number(cost);
  const total = numericCost > 0 ? numericCost * current.stockLevel : 0;

  const advance = () => {
    if (index < items.length - 1) {
      setIndex(index + 1);
      setCost('');
    } else {
      setIsOpen(false);
      router.refresh();
    }
  };

  const handleSave = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await setHealthItemCost({
        inventoryId: current.id,
        costPerUnit: numericCost,
      });
      if (result?.success) {
        advance();
      } else {
        setError(result?.error || 'The price could not be saved. Try again.');
      }
    } catch {
      setError('The price could not be saved. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="What did this cost?"
      description={`${current.itemName} was added to stock without a price. Add it so your health spending is counted.`}
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        noValidate
      >
        {items.length > 1 ? (
          <FormSteps steps={items.map((item) => ({ id: item.id, label: item.itemName }))} current={index} />
        ) : null}

        <div className="flex items-center gap-3 rounded-xl border border-fg/[0.08] bg-tile p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fg/[0.06] text-fg-2">
            {isVaccine ? <Syringe className="h-5 w-5" strokeWidth={1.5} /> : <Pill className="h-5 w-5" strokeWidth={1.5} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{current.itemName}</p>
            <p className="text-[13px] text-fg-3">
              {isVaccine ? 'Vaccine' : 'Medicine'} · {current.stockLevel} {current.unit} in stock
            </p>
          </div>
        </div>

        <Input
          label={`Price for one ${(current.unit || 'unit').replace(/s$/, '')}`}
          placeholder="0.00"
          type="number"
          min="0"
          step="any"
          unit={money.currency}
          value={cost}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || Number(v) >= 0) setCost(v);
          }}
          hint={current.stockLevel <= 0 ? 'None left in stock, but the cost is still recorded.' : undefined}
        />

        {total > 0 ? (
          <FormSummary>
            <FormSummaryRow label="Value of this stock" value={money.format(total)} strong />
          </FormSummary>
        ) : null}

        <FormError>{error}</FormError>

        <FormActions note="Skip and you will be asked again next time.">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Skip for now
          </Button>
          <Button type="submit" variant="accent" isLoading={isSubmitting} loadingText="Saving" disabled={!cost || numericCost < 0}>
            {index < items.length - 1 ? 'Save and next' : 'Save'}
          </Button>
        </FormActions>
      </Form>
    </Dialog>
  );
}
