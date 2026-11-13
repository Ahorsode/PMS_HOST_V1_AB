'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banknote, Truck, Plus, Trash2, AlertCircle } from 'lucide-react';
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
     if (confirm("Are you sure this unit has zero initial cost? This will stop future prompts for this unit.")) {
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
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Failed to save financials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onOpenChange={() => {}} // Force user to address it
      title="Missing financial data"
      description={`Unit "${currentBatch.batchName}" is missing its initial purchase cost. Please record it now for accurate P&L tracking.`}
    >
      <div className="space-y-5 pt-3">
        {/* Progress Indicator */}
        <div className="flex gap-1 mb-3">
           {batches.map((_, i) => (
             <div key={i} className={`h-1 flex-1 rounded-full ${i === currentIndex ? 'bg-emerald-500' : i < currentIndex ? 'bg-fg/[0.04]' : 'bg-fg/10'}`} />
           ))}
        </div>

        <div className="p-3 rounded-md bg-fg/[0.04] border border-fg/[0.08] flex gap-2">
           <AlertCircle className="w-5 h-5 text-fg-3 shrink-0" />
           <p className="text-xs text-fg leading-relaxed font-medium">
             Financial accuracy depends on recording the initial investment. This ensures your <span className="text-fg font-medium">Return on investment (ROI)</span> calculations are correct.
           </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Input 
              label="Cost per unit"
              placeholder="0.00"
              type="number"
              min="0"
              value={costPerUnit}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) {
                  setCostPerUnit(val);
                }
              }}
            />
            {costPerUnit && Number(costPerUnit) > 0 && (
              <p className="text-xs font-medium text-fg px-1 text-right">
                Total Purchase Cost: {money.format((Number(costPerUnit) * currentBatch.initialCount))}
              </p>
            )}
          </div>

          <Input 
            label="Carriage inward (transport cost)"
            placeholder="0.00"
            type="number"
            min="0"
            value={carriageInward}
            onChange={e => {
              const val = e.target.value;
              if (val === '' || Number(val) >= 0) {
                setCarriageInward(val);
              }
            }}
          />

          <div className="space-y-2">
             <label className="text-xs font-medium text-fg/70 block">Additional expenses</label>
             <div className="grid grid-cols-5 gap-2">
                <input 
                  placeholder="Label (e.g. loading)"
                  className="col-span-3 bg-fg/10 border border-fg/10 rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:border-fg/[0.08]"
                  value={newExpenseLabel}
                  onChange={e => setNewExpenseLabel(e.target.value)}
                />
                <input 
                  placeholder="0.00"
                  type="number"
                  min="0"
                  className="col-span-1 bg-fg/10 border border-fg/10 rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:border-fg/[0.08]"
                  value={newExpenseAmount}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setNewExpenseAmount(val);
                    }
                  }}
                />
                <Button aria-label="Add another cost" 
                  type="button" 
                  variant="outline" 
                   onClick={handleAddOther}
                  className="col-span-1 rounded-md h-10 border-fg/[0.08] text-fg-3 hover:bg-fg/[0.04]"
                >
                   <Plus className="w-4 h-4" />
                </Button>
             </div>

             {otherExpenses.length > 0 && (
               <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {otherExpenses.map((exp, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md bg-fg/10 border border-fg/5">
                       <span className="text-xs font-medium text-fg/80">{exp.label}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-fg">{money.format(exp.amount)}</span>
                          <button aria-label="Remove cost" onClick={() => removeOther(i)} className="text-neg hover:text-neg transition-colors">
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>

        <div className="flex gap-2 pt-3">
           <Button 
             variant="ghost" 
             onClick={handleSkip}
             className="flex-1 rounded-md text-fg/70 hover:text-neg hover:bg-fg/[0.04]"
           >
              Confirm zero cost
           </Button>
           <Button 
             onClick={() => handleSubmit(false)}
             isLoading={isSubmitting}
             disabled={!costPerUnit || Number(costPerUnit) <= 0}
             className="flex-[2] rounded-md bg-fg text-page font-medium hover:bg-fg/90"
           >
              Save & {currentIndex < batches.length - 1 ? 'Next unit' : 'Finish'}
           </Button>
        </div>
      </div>
    </Dialog>
  );
}
