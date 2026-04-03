"use client";

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Card, CardContent } from '@/components/ui/Card';
import { Banknote, Truck, Plus, Trash2, Save, X } from 'lucide-react';
import { updateBatchFinancials } from '@/lib/actions/dashboard-actions';
import { toast } from 'sonner';

interface FinancialInitializationModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchName: string;
}

export function FinancialInitializationModal({ isOpen, onClose, batchId, batchName }: FinancialInitializationModalProps) {
  const [actualCost, setActualCost] = useState<number>(0);
  const [carriageCost, setCarriageCost] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<{ label: string; amount: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOtherExpense = () => {
    setOtherExpenses([...otherExpenses, { label: '', amount: 0 }]);
  };

  const removeOtherExpense = (index: number) => {
    setOtherExpenses(otherExpenses.filter((_, i) => i !== index));
  };

  const updateOtherExpense = (index: number, field: 'label' | 'amount', value: string | number) => {
    const updated = [...otherExpenses];
    (updated[index] as any)[field] = value;
    setOtherExpenses(updated);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateBatchFinancials(Number(batchId), {
        actualCost,
        carriageInward: carriageCost,
        otherExpenses
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
      onOpenChange={(open) => !open && onClose()} 
      title={`Financial Initialization: ${batchName}`}
      description="Initialize the investment costs for this livestock unit. These will be recorded as farm expenses for accurate P&L reporting."
    >
      <div className="space-y-6 pt-4">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
               <Banknote className="w-3 h-3" /> Actual Unit Cost
            </label>
            <input 
              type="number" 
              value={actualCost}
              onChange={(e) => setActualCost(Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-emerald-500/50 transition-colors outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
               <Truck className="w-3 h-3" /> Carriage / Transport
            </label>
            <input 
              type="number" 
              value={carriageCost}
              onChange={(e) => setCarriageCost(Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500/50 transition-colors outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
               Other Direct Expenses
            </label>
            <button 
              onClick={addOtherExpense}
              className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
             {otherExpenses.map((exp, idx) => (
               <div key={idx} className="flex gap-2 items-center">
                  <input 
                    placeholder="Expense Label (e.g. Agent Fee)"
                    value={exp.label}
                    onChange={(e) => updateOtherExpense(idx, 'label', e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold"
                  />
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={exp.amount}
                    onChange={(e) => updateOtherExpense(idx, 'amount', Number(e.target.value))}
                    className="w-24 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold"
                  />
                  <button 
                    onClick={() => removeOtherExpense(idx)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
             ))}
             {otherExpenses.length === 0 && (
               <div className="text-center py-4 border border-dashed border-white/10 rounded-2xl text-white/30 text-[10px] uppercase font-black">
                  No additional expenses
               </div>
             )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Skip for Now
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 py-4 rounded-2xl bg-emerald-500 text-[#064e3b] font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Initial Costs'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
