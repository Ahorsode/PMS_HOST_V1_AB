'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Skull, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FlockForm } from './FlockForm';
import Link from 'next/link';

export const FlockActionsHeader = ({ houses }: { houses: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/flocks/analytics"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-black uppercase text-xs tracking-widest group"
        >
          <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Indept Management
        </Link>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Batch
        </Button>
      </div>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Add New Batch">
        <FlockForm houses={houses} mode="create" onClose={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
};

export const FlockRowActions = ({ batch, houses }: { batch: any, houses: any[] }) => {
  const [mode, setMode] = useState<'edit' | 'delete' | 'mortality' | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/dashboard/flocks/${batch.id}`}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
        title="Indept Management"
      >
        <Eye className="h-3 w-3" />
        <span>Indept</span>
      </Link>
      <button 
        onClick={() => setMode('mortality')}
        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Log Mortality"
      >
        <Skull className="h-4 w-4" />
      </button>
      <button 
        onClick={() => setMode('edit')}
        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Edit Batch"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button 
        onClick={() => setMode('delete')}
        className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
        title="Delete Batch"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog 
        isOpen={mode !== null} 
        onOpenChange={(open) => !open && setMode(null)} 
        title={mode === 'edit' ? 'Edit Batch' : mode === 'delete' ? 'Delete Batch' : 'Log Mortality'}
      >
        {mode && (
          <FlockForm 
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
