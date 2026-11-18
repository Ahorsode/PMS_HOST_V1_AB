'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';
import { FeedForm } from './FeedForm';
import { InventoryForm } from './InventoryForm';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';

export const FeedActionsHeader = ({ batches, inventory, formulations = [] }: { batches: any[], inventory: any[], formulations?: any[] }) => {
  const [openFeed, setOpenFeed] = useState(false);
  const [openItem, setOpenItem] = useState(false);

  return (
    <div className="flex gap-2">
      <Link 
        href="/dashboard/feed/analytics"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-fg/[0.08] bg-raised px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-raised-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <BarChart3 className="h-4 w-4 text-fg-2" strokeWidth={1.5} />
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

export const FeedLogActions = ({
  log,
  batches,
  inventory,
  formulations = [],
  variant = 'icons',
  onChanged,
}: {
  log: any;
  batches: any[];
  inventory: any[];
  formulations?: any[];
  /** `menu`: one ⋯ button with Edit and Delete (phones). */
  variant?: 'icons' | 'menu';
  /** Called after an edit or delete is saved, so the page can reload its list. */
  onChanged?: () => void;
}) => {
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
        onChanged?.();
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

  const dialogs = (
    <>
      <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && setMode(null)} title="Edit feeding log">
        {mode && <FeedForm log={log} batches={batches} inventory={inventory} formulations={formulations} mode={mode} onClose={() => setMode(null)} onSaved={onChanged} />}
      </Dialog>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={`Feed Log (${new Date(log.logDate).toLocaleDateString()})`}
        isLoading={isDeleting}
      />
    </>
  );

  if (variant === 'menu') {
    return (
      <>
        <QlOverflowMenu
          label="More actions for this feeding log"
          items={[
            { label: 'Edit log', icon: Edit2, onSelect: () => setMode('edit') },
            { label: 'Delete log…', icon: Trash2, destructive: true, onSelect: () => setShowDeleteModal(true) },
          ]}
        />
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" aria-label="Edit feeding log" title="Edit" onClick={() => setMode('edit')} className={quickButtonClass('edit')}>
        <Edit2 {...QUICK_ICON} />
      </button>
      <button type="button" aria-label="Delete feeding log" title="Delete" onClick={() => setShowDeleteModal(true)} className={quickButtonClass('delete')}>
        <Trash2 {...QUICK_ICON} />
      </button>

      {dialogs}
    </div>
  );
};
