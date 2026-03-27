'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { FeedForm } from './FeedForm';
import { InventoryForm } from './InventoryForm';

export const FeedActionsHeader = ({ batches, inventory }: { batches: any[], inventory: any[] }) => {
  const [openFeed, setOpenFeed] = useState(false);
  const [openItem, setOpenItem] = useState(false);

  return (
    <div className="flex gap-3">
      <Link 
        href="/dashboard/feed/analytics"
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-black uppercase text-xs tracking-widest group"
      >
        <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Indept Management
      </Link>
      <Button variant="outline" onClick={() => setOpenItem(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </Button>
      <Button onClick={() => setOpenFeed(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Log Feeding
      </Button>

      <Dialog isOpen={openFeed} onOpenChange={setOpenFeed} title="Log Feeding">
        <FeedForm batches={batches} inventory={inventory} mode="create" onClose={() => setOpenFeed(false)} />
      </Dialog>

      <Dialog isOpen={openItem} onOpenChange={setOpenItem} title="Add Inventory Item">
        <InventoryForm mode="create" onClose={() => setOpenItem(false)} />
      </Dialog>
    </div>
  );
};

export const FeedLogActions = ({ log, batches, inventory }: { log: any, batches: any[], inventory: any[] }) => {
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setMode('edit')} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
        <Edit2 className="h-4 w-4" />
      </button>
      <button onClick={() => setMode('delete')} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && setMode(null)} title={mode === 'edit' ? 'Edit Feeding Log' : 'Delete Log'}>
        {mode && <FeedForm log={log} batches={batches} inventory={inventory} mode={mode} onClose={() => setMode(null)} />}
      </Dialog>
    </div>
  );
};

export const InventoryActions = ({ item }: { item: any }) => {
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/dashboard/feed/inventory/${item.id}`}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
        title="Indept Management"
      >
        <Eye className="h-3 w-3" />
        <span>Indept</span>
      </Link>
      <button onClick={() => setMode('edit')} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
        <Edit2 className="h-4 w-4" />
      </button>
      <button onClick={() => setMode('delete')} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && setMode(null)} title={mode === 'edit' ? 'Edit Item' : 'Delete Item'}>
        {mode && <InventoryForm item={item} mode={mode} onClose={() => setMode(null)} />}
      </Dialog>
    </div>
  );
};
