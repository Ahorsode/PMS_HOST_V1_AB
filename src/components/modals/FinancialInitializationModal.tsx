"use client";

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Card, CardContent } from '@/components/ui/Card';
import { Banknote, Truck, Plus, Trash2, Save, X, Loader2 } from 'lucide-react';
import { updateBatchFinancials } from '@/lib/actions/dashboard-actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider'
import { MutationBoundary } from '@/components/ui/MutationFeedback';

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
        toast.success("Financial records initialized successfully");
        onClose();
      } else {
        toast.error(result.error || "Failed to save financials");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onOpenChange={(open) => !open && !isSubmitting && onClose()} 
      title={`Financial Initialization: ${batchName}`}
      description="Initialize the investment costs for this livestock unit. these will be recorded as farm expenses for accurate P&L reporting."
    >
      <MutationBoundary active={isSubmitting} label="Saving initial costs...">
      <div className="space-y-5 pt-3">
        
        <div className="bg-fg/[0.04] border border-fg/[0.08] rounded-lg p-3 flex justify-between items-center">
           <div>
              <p className="text-xs font-medium text-fg">Quantity for unit</p>
              <p className="text-lg font-medium text-fg">{quantity.toLocaleString()} Birds / Heads</p>
           </div>
           <div className="text-right">
              <p className="text-xs font-medium text-fg">Total actual cost</p>
              <p className="text-xl font-medium text-fg">{formatCurrency(totalActualCost, currency)}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-fg flex items-center gap-2">
               <Banknote className="w-3 h-3" /> Cost per unit
            </label>
            <input 
              type="number" 
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-fg/[0.04] border border-fg/10 rounded-md px-3 py-2 text-fg font-medium focus:border-fg/[0.08] transition-colors outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-fg-2 flex items-center gap-2">
               <Truck className="w-3 h-3" /> Carriage / transport
            </label>
            <input 
              type="number" 
              min="0"
              value={carriageCost}
              onChange={(e) => setCarriageCost(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-fg/[0.04] border border-fg/10 rounded-md px-3 py-2 text-fg font-medium focus:border-fg/[0.08] transition-colors outline-none"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-fg-2 flex items-center gap-2">
               Other direct expenses
            </label>
            <button aria-label="Add expense" 
              onClick={addOtherExpense}
              disabled={isSubmitting}
              className="p-1.5 bg-fg/[0.06] border border-fg/[0.08] rounded-lg text-fg-2 hover:bg-fg/[0.06] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
             {otherExpenses.map((exp, idx) => (
               <div key={idx} className="flex gap-2 items-center">
                  <input 
                    placeholder="Expense label (e.g. agent fee)"
                    value={exp.label}
                    onChange={(e) => updateOtherExpense(idx, 'label', e.target.value)}
                    className="flex-1 bg-fg/[0.04] border border-fg/10 rounded-md px-3 py-2 text-xs text-fg font-medium"
                  />
                  <input 
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={exp.amount}
                    onChange={(e) => updateOtherExpense(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-24 bg-fg/[0.04] border border-fg/10 rounded-md px-3 py-2 text-xs text-fg font-medium"
                  />
                  <button aria-label="Remove expense" 
                    onClick={() => removeOtherExpense(idx)}
                    disabled={isSubmitting}
                    className="p-2 text-neg hover:bg-fg/[0.04] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
             ))}
             {otherExpenses.length === 0 && (
               <div className="text-center py-3 border border-dashed border-fg/10 rounded-md text-fg/70 text-xs font-medium">
                  No additional expenses
               </div>
             )}
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-md bg-fg/10 border border-fg/10 text-fg font-medium text-xs hover:bg-fg/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip for now
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-md bg-fg text-page font-medium text-xs hover:bg-fg/90 transition-colors disabled:opacity-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Initial Costs'}
            </span>
          </button>
        </div>
      </div>
      </MutationBoundary>
    </Dialog>
  );
}
