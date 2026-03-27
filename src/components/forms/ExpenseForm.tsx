'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AlertCircle, CheckCircle2, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createExpense } from '@/lib/actions/expense-actions';

const CATEGORIES = [
  'FEED',
  'MEDICATION',
  'EQUIPMENT',
  'LABOR',
  'UTILITIES',
  'TRANSPORT',
  'MAINTENANCE',
  'OTHER'
];

export function ExpenseForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categoryOptions = CATEGORIES.map(cat => ({ label: cat, value: cat }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      amount: Number(formData.get('amount')),
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      expenseDate: formData.get('expenseDate') as string,
      reference: formData.get('reference') as string,
    };

    if (!data.amount || !data.category || !data.expenseDate) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    const result = await createExpense(data);
    if (result.success) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || 'Failed to log expense');
    }
    setLoading(false);
  }

  return (
    <Card className="bg-[#1a1a1a]/80 border-white/10 backdrop-blur-xl shadow-2xl">
      <CardHeader className="border-b border-white/5 pb-4">
        <CardTitle className="text-xl font-black text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Log Expense
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/50 tracking-widest italic flex items-center gap-1 ml-1 opacity-70">
                <Tag className="w-3 h-3 text-emerald-400" /> Category
              </label>
              <Select 
                name="category" 
                required 
                defaultValue="FEED"
                options={categoryOptions}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/50 tracking-widest italic flex items-center gap-1 ml-1 opacity-70">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Amount (Cedi)
              </label>
              <Input 
                name="amount" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                required 
                className="bg-black/50 border-white/10 rounded-xl text-white placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/50 tracking-widest italic flex items-center gap-1 ml-1 opacity-70">
                <Calendar className="w-3 h-3 text-emerald-400" /> Date
              </label>
              <Input 
                name="expenseDate" 
                type="date" 
                required 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="bg-black/50 border-white/10 rounded-xl text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/50 tracking-widest italic flex items-center gap-1 ml-1 opacity-70">
                <FileText className="w-3 h-3 text-emerald-400" /> Reference / Receipt #
              </label>
              <Input 
                name="reference" 
                placeholder="Ref-001" 
                className="bg-black/50 border-white/10 rounded-xl text-white placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/50 tracking-widest italic flex items-center gap-1 ml-1 opacity-70">
              <FileText className="w-3 h-3 text-emerald-400" /> Description
            </label>
            <Input 
              name="description" 
              placeholder="Detailed description of the expense..." 
              className="bg-black/50 border-white/10 rounded-xl text-white placeholder:text-white/20"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Expense logged successfully!
              </motion.div>
            )}
          </AnimatePresence>

          <Button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest h-12 rounded-xl"
          >
            {loading ? 'Logging...' : 'Log Expense'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
