'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, BarChart3, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { FeedForm } from './FeedForm';
import { InventoryForm } from './InventoryForm';

export const FeedActionsHeader = ({ batches, inventory, formulations = [] }: { batches: any[], inventory: any[], formulations?: any[] }) => {
  const [openFeed, setOpenFeed] = useState(false);
  const [openItem, setOpenItem] = useState(false);

  return (
    <div className="flex gap-2">
      <Link 
        href="/dashboard/feed/analytics"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#232325] px-4 text-sm font-medium text-[#ededed] transition-colors duration-150 hover:bg-[#2c2c2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60"
      >
        <BarChart3 className="h-4 w-4 text-[#a1a1a6]" strokeWidth={1.5} />
        Feed analytics
      </Link>
      <Button variant="outline" onClick={() => setOpenItem(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>
      <Button onClick={() => setOpenFeed(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Log feeding
      </Button>

      <Dialog isOpen={openFeed} onOpenChange={setOpenFeed} title="Log feeding">
        <FeedForm batches={batches} inventory={inventory} formulations={formulations} mode="create" onClose={() => setOpenFeed(false)} />
      </Dialog>

      <Dialog isOpen={openItem} onOpenChange={setOpenItem} title="Add inventory item">
        <InventoryForm mode="create" onClose={() => setOpenItem(false)} />
      </Dialog>
    </div>
  );
};

export const FeedLogActions = ({ log, batches, inventory, formulations = [] }: { log: any, batches: any[], inventory: any[], formulations?: any[] }) => {
  const [mode, setMode] = useState<'edit' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (reason: string) => {
    setIsDeleting(true);
    try {
      const { deleteFeedingLog } = await import('@/lib/actions/feed-actions');
      const res = await deleteFeedingLog(log.id, reason);
      if (res.success) {
        setShowDeleteModal(false);
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete log');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button aria-label="Edit feeding log" onClick={() => setMode('edit')} className="p-1 text-[#a1a1a6] hover:bg-white/[0.06] rounded transition-colors">
        <Edit2 className="h-4 w-4" />
      </button>
      <button aria-label="Delete feeding log" onClick={() => setShowDeleteModal(true)} className="p-1 text-[#85858b] hover:bg-[#232325] rounded transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && setMode(null)} title="Edit feeding log">
        {mode && <FeedForm log={log} batches={batches} inventory={inventory} formulations={formulations} mode={mode} onClose={() => setMode(null)} />}
      </Dialog>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={`Feed Log (${new Date(log.logDate).toLocaleDateString()})`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export const InventoryActions = ({ item }: { item: any }) => {
  const [mode, setMode] = useState<'edit' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (reason: string) => {
    setIsDeleting(true);
    try {
      const { deleteInventoryItem } = await import('@/lib/actions/inventory-actions');
      const res = await deleteInventoryItem(item.id, reason);
      if (res.success) {
        setShowDeleteModal(false);
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete item');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/dashboard/feed/inventory/${item.id}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#85858b] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#ededed]"
        title="Open item"
        aria-label="Open item"
      >
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
      <button aria-label="Edit inventory item" onClick={() => setMode('edit')} className="p-1 text-[#a1a1a6] hover:bg-white/[0.06] rounded transition-colors">
        <Edit2 className="h-4 w-4" />
      </button>
      <button aria-label="Delete inventory item" onClick={() => setShowDeleteModal(true)} className="p-1 text-[#85858b] hover:bg-[#232325] rounded transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && setMode(null)} title="Edit item">
        {mode && <InventoryForm item={item} mode={mode} onClose={() => setMode(null)} />}
      </Dialog>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={item.itemName}
        isLoading={isDeleting}
      />
    </div>
  );
};
