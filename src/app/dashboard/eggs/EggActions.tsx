'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EggForm } from './EggForm';
import Link from 'next/link';

export const EggActionsHeader = ({ batches }: { batches: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/eggs/analytics"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-black uppercase text-xs tracking-widest group"
        >
          <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Indept Management
        </Link>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log New Production
        </Button>
      </div>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Log Egg Production">
        <EggForm batches={batches} mode="create" onClose={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
};

export const EggLogActions = ({ log, batches }: { log: any, batches: any[] }) => {
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/dashboard/flocks/${log.batchId}`}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
        title="Indept Management"
      >
        <Eye className="h-3 w-3" />
        <span>Indept</span>
      </Link>
      <button 
        onClick={() => setMode('edit')}
        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button 
        onClick={() => setMode('delete')}
        className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog 
        isOpen={mode !== null} 
        onOpenChange={(open) => !open && setMode(null)} 
        title={mode === 'edit' ? 'Edit Production Log' : 'Delete Log'}
      >
        {mode && (
          <EggForm 
            log={log} 
            batches={batches} 
            mode={mode} 
            onClose={() => setMode(null)} 
          />
        )}
      </Dialog>
    </div>
  );
};

export const LogProductionButton = ({ batchId, batches }: { batchId: number, batches: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-green-800 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
      >
        Log Production
      </button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Log Egg Production">
        <EggForm 
          batches={batches} 
          mode="create" 
          defaultBatchId={batchId} 
          onClose={() => setIsOpen(false)} 
        />
      </Dialog>
    </>
  );
};
