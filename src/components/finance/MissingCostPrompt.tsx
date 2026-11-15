'use client';

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormSection,
  FormSteps,
  FormSummary,
  FormSummaryRow,
  Input,
} from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateBatchFinancials } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';
import { useMoney } from '@/components/providers/CurrencyProvider'

interface Batch {
  id: string;
  batchName: string;
  initialCount: number;
  type: string;
}

interface MissingCostPromptProps {
  batches: Batch[];
}

export function MissingCostPrompt({ batches }: MissingCostPromptProps) {
  const money = useMoney()
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(batches.length > 0);

  const [costPerUnit, setCostPerUnit] = useState('');
  const [carriageInward, setCarriageInward] = useState('');
  const [otherExpenses, setOtherExpenses] = useState<Array<{ label: string, amount: number }>>([]);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  const currentBatch = batches[currentIndex];

  if (!currentBatch || !isOpen) return null;

  const handleAddOther = () => {
    if (newExpenseLabel && newExpenseAmount) {
      setOtherExpenses([...otherExpenses, { label: newExpenseLabel, amount: Number(newExpenseAmount) }]);
      setNewExpenseLabel('');
      setNewExpenseAmount('');
    }
  };

  const removeOther = (index: number) => {
    setOtherExpenses(otherExpenses.filter((_, i) => i !== index));
  };

  const handleSkip = () => {
     // If user really wants to skip (keep as 0), we should probably record it as 0.01 or something 
     // but the requirement says "prompt to add". I'll allow a "Confirm Zero Cost" if they really want.
     if (confirm("Did this flock really cost nothing? You will not be asked about it again.")) {
        handleSubmit(true);
     }
  };

  const handleSubmit = async (isZero = false) => {
    setIsSubmitting(true);
    try {
      const result = await updateBatchFinancials(currentBatch.id, {
        actualCost: isZero ? 0.001 : Number(costPerUnit) * currentBatch.initialCount, // Using tiny value to differentiate from "not set" if needed, or just 0
        carriageInward: isZero ? 0 : Number(carriageInward),
        otherExpenses: isZero ? [] : otherExpenses
      });

      if (result.success) {
        if (currentIndex < batches.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setCostPerUnit('');
          setCarriageInward('');
          setOtherExpenses([]);
        } else {
          setIsOpen(false);
          router.refresh();
        }
      } else {
        toast.error(result.error || "The cost could not be saved. Try again.");
      }
    } catch (error) {
      toast.error("The cost could not be saved. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const purchaseTotal = Number(costPerUnit) > 0 ? Number(costPerUnit) * currentBatch.initialCount : 0;
  const otherTotal = otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const isLast = currentIndex >= batches.length - 1;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={() => {}} // Force user to address it
      title="What did this flock cost?"
      description={`${currentBatch.batchName} has no buying cost yet. Add it so your profit is worked out correctly.`}
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(false);
        }}
        noValidate
      >
        {batches.length > 1 ? (
          <FormSteps steps={batches.map((batch) => ({ id: batch.id, label: batch.batchName }))} current={currentIndex} />
        ) : null}

        <FormSection title="Buying the birds">
          <Input
            label="Price for one"
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
            unit={money.currency}
            hint={`${currentBatch.initialCount.toLocaleString()} in this flock`}
            value={costPerUnit}
            onChange={e => {
              const val = e.target.value;
              if (val === '' || Number(val) >= 0) {
                setCostPerUnit(val);
              }
            }}
          />
          <Input
            label="Transport"
            optional
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
            unit={money.currency}
            value={carriageInward}
            onChange={e => {
              const val = e.target.value;
              if (val === '' || Number(val) >= 0) {
                setCarriageInward(val);
              }
            }}
          />
        </FormSection>

        <FormSection title="Other costs" hint="e.g. loading or an agent fee.">
          {otherExpenses.length > 0 ? (
            <ul className="divide-y divide-fg/[0.06] rounded-xl border border-fg/[0.08] bg-tile">
              {otherExpenses.map((exp, i) => (
                <li key={i} className="flex min-h-12 items-center justify-between gap-3 py-1 pl-3.5 pr-1 text-sm">
                  <span className="min-w-0 truncate text-fg">{exp.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums text-fg">{money.format(exp.amount)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${exp.label}`}
                      onClick={() => removeOther(i)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-neg-solid/10 hover:text-neg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-end gap-3">
            <Input
              label="What for"
              placeholder="e.g. Loading"
              value={newExpenseLabel}
              onChange={e => setNewExpenseLabel(e.target.value)}
            />
            <Input
              label="Amount"
              placeholder="0.00"
              type="number"
              min="0"
              value={newExpenseAmount}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) {
                  setNewExpenseAmount(val);
                }
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleAddOther} disabled={!newExpenseLabel || !newExpenseAmount} className="w-full">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add this cost
          </Button>
        </FormSection>

        <FormSummary>
          <FormSummaryRow
            label={`Birds (${currentBatch.initialCount.toLocaleString()} × ${money.format(Number(costPerUnit) || 0)})`}
            value={money.format(purchaseTotal)}
          />
          <FormSummaryRow label="Transport" value={money.format(Number(carriageInward) || 0)} />
          {otherExpenses.length > 0 ? <FormSummaryRow label="Other costs" value={money.format(otherTotal)} /> : null}
          <FormSummaryRow
            label="Total paid"
            value={money.format(purchaseTotal + (Number(carriageInward) || 0) + otherTotal)}
            strong
          />
        </FormSummary>

        <FormActions>
          <Button type="button" variant="outline" onClick={handleSkip} disabled={isSubmitting}>
            It cost nothing
          </Button>
          <Button
            type="submit"
            variant="accent"
            isLoading={isSubmitting}
            loadingText="Saving"
            disabled={!costPerUnit || Number(costPerUnit) <= 0}
          >
            {isLast ? 'Save' : 'Save and next flock'}
          </Button>
        </FormActions>
      </Form>
    </Dialog>
  );
}
