'use client'

import React, { useState } from 'react';
import { Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { SaleForm } from './SaleForm';

export const SaleActionsHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/sales/analytics"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-black uppercase text-xs tracking-widest group"
        >
          <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Indept Management
        </Link>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Sale
        </Button>
      </div>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Record New Sale" className="max-w-2xl">
        <SaleForm mode="create" onClose={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
};

export const SaleRowActions = ({ sale }: { sale: any }) => {
  const [mode, setMode] = useState<'delete' | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/dashboard/sales/${sale.id}`}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
        title="Indept Management"
      >
        <Eye className="h-3 w-3" />
        <span>Indept</span>
      </Link>
      <button 
        onClick={() => setMode('delete')} 
        className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog 
        isOpen={mode !== null} 
        onOpenChange={(open) => !open && setMode(null)} 
        title="Delete Sale Record"
      >
        {mode === 'delete' && <SaleForm sale={sale} mode="delete" onClose={() => setMode(null)} />}
      </Dialog>
    </div>
  );
};
