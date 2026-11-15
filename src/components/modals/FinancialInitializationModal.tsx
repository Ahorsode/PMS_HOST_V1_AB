"use client";

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormSection,
  FormSummary,
  FormSummaryRow,
  Input,
} from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { updateBatchFinancials } from '@/lib/actions/dashboard-actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider'

interface FinancialInitializationModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchName: string;
  quantity: number;
}

export function FinancialInitializationModal({ isOpen, onClose, batchId, batchName, quantity }: FinancialInitializationModalProps) {
  const currency = useCurrency()
  const [costPerUnit, setCostPerUnit] = useState<number | ''>(0);
  const [carriageCost, setCarriageCost] = useState<number | ''>(0);
  const [otherExpenses, setOtherExpenses] = useState<{ label: string; amount: number | '' }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalActualCost = (Number(costPerUnit) || 0) * quantity;

  const addOtherExpense = () => {
    setOtherExpenses([...otherExpenses, { label: '', amount: '' }]);
  };

  const removeOtherExpense = (index: number) => {
    setOtherExpenses(otherExpenses.filter((_, i) => i !== index));
  };

  const updateOtherExpense = (index: number, field: 'label' | 'amount', value: string | number | '') => {
    const updated = [...otherExpenses];
    (updated[index] as any)[field] = value;
    setOtherExpenses(updated);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await updateBatchFinancials(batchId, {
        actualCost: totalActualCost,
        carriageInward: Number(carriageCost) || 0,
        otherExpenses: otherExpenses.map(exp => ({
          ...exp,
          amount: Number(exp.amount) || 0
        }))
      });

      if (result.success) {
        toast.success("Flock costs saved");
        onClose();
      } else {
        toast.error(result.error || "The costs could not be saved. Try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const otherTotal = otherExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const grandTotal = totalActualCost + (Number(carriageCost) || 0) + otherTotal;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isSubmitting && onClose()}
      title="What did this flock cost?"
      description={`${batchName}: record what you paid so your profit is worked out correctly.`}
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleSave();
        }}
        noValidate
      >
        <FormSection title="Buying the birds">
          <Input
            label="Price for one"
            type="number"
            min="0"
            step="0.01"
            unit={currency}
            placeholder="e.g. 12.50"
            hint={`${quantity.toLocaleString()} in this flock`}
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            disabled={isSubmitting}
          />
          <Input
            label="Transport"
            optional
            type="number"
            min="0"
            step="0.01"
            unit={currency}
            placeholder="e.g. 200"
            value={carriageCost}
            onChange={(e) => setCarriageCost(e.target.value === '' ? '' : Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            disabled={isSubmitting}
          />
        </FormSection>

        <FormSection title="Other costs" hint="Anything else you paid to bring this flock in, such as an agent fee.">
          {otherExpenses.length > 0 ? (
            <ul className="space-y-3">
              {otherExpenses.map((exp, idx) => (
                <li key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-xl border border-fg/[0.08] bg-tile p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                  <Input
                    label="What for"
                    wrapperClassName="col-span-2 sm:col-span-1"
                    placeholder="e.g. Agent fee"
                    value={exp.label}
                    onChange={(e) => updateOtherExpense(idx, 'label', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Amount"
                    type="number"
                    min="0"
                    step="0.01"
                    unit={currency}
                    placeholder="0"
                    value={exp.amount}
                    onChange={(e) => updateOtherExpense(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    aria-label={`Remove cost ${idx + 1}`}
                    onClick={() => removeOtherExpense(idx)}
                    disabled={isSubmitting}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neg/30 bg-neg/10 text-neg transition-colors duration-150 hover:bg-neg/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:w-11"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button type="button" variant="outline" onClick={addOtherExpense} disabled={isSubmitting} className="w-full">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add another cost
          </Button>
        </FormSection>

        <FormSummary>
          <FormSummaryRow
            label={`Birds (${quantity.toLocaleString()} × ${formatCurrency(Number(costPerUnit) || 0, currency)})`}
            value={formatCurrency(totalActualCost, currency)}
          />
          <FormSummaryRow label="Transport" value={formatCurrency(Number(carriageCost) || 0, currency)} />
          {otherExpenses.length > 0 ? (
            <FormSummaryRow label="Other costs" value={formatCurrency(otherTotal, currency)} />
          ) : null}
          <FormSummaryRow label="Total paid" value={formatCurrency(grandTotal, currency)} strong />
        </FormSummary>

        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Skip for now
          </Button>
          <Button type="submit" variant="accent" isLoading={isSubmitting} loadingText="Saving">
            Save costs
          </Button>
        </FormActions>
      </Form>
    </Dialog>
  );
}
