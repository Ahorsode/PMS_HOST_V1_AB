'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Skull, Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { LivestockForm } from './FlockForm';
import { RegisterBatchForm } from '@/components/forms/RegisterBatchForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const FlockActionsHeader = ({ houses }: { houses: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link 
          href="/dashboard/flocks/analytics"
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-all font-bold uppercase text-xs tracking-widest group"
        >
          <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Management Unit
        </Link>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Unit
        </Button>
      </div>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Register New Livestock Unit">
        <RegisterBatchForm houses={houses} onSuccess={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
};

export const FlockRowActions = ({ batch, houses }: { batch: any, houses: any[] }) => {
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'delete' | 'mortality' | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/dashboard/flocks/${batch.id}`}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
        title="View Management"
      >
        <Eye className="h-3 w-3" />
        <span>Manage</span>
      </Link>
      <button 
        onClick={() => setMode('mortality')}
        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Log Mortality"
      >
        <Skull className="h-4 w-4" />
      </button>
      <button 
        onClick={() => router.push(`/dashboard/sales?sellBatchId=${batch.id}`)}
        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        title="Quick Sell"
      >
        <ShoppingCart className="h-4 w-4" />
      </button>
      <button 
        onClick={() => setMode('edit')}
        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Edit Unit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button 
        onClick={() => setMode('delete')}
        className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
        title="Delete Unit"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog 
        isOpen={mode !== null} 
        onOpenChange={(open) => !open && setMode(null)} 
        title={mode === 'edit' ? 'Edit Unit' : mode === 'delete' ? 'Delete Unit' : 'Log Mortality'}
      >
        {mode && (
            <LivestockForm 
              batch={batch} 
              houses={houses} 
              mode={mode} 
              onClose={() => setMode(null)} 
            />
        )}
      </Dialog>
    </div>
  );
};
