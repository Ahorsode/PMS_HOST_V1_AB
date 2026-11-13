'use client'

import React, { useState } from 'react';
import { BarChart3, Plus, Pencil, Trash2, Skull, ShoppingCart } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { LivestockForm } from './FlockForm';
import { RegisterBatchForm } from '@/components/forms/RegisterBatchForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { MutationBoundary } from '@/components/ui/MutationFeedback';
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';
import { ActionButton, buttonClass } from './flock-ui';

const ICON = { className: 'h-4 w-4', strokeWidth: 1.5 } as const;
const ROW_ICON = QUICK_ICON;

export const FlockActionsHeader = ({ houses, canEdit = true }: { houses: any[], canEdit?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center gap-2 md:w-auto">
        <Link href="/dashboard/flocks/analytics" className={buttonClass('secondary', 'md', 'flex-1 md:flex-none')}>
          <BarChart3 className="h-4 w-4 text-fg-2" strokeWidth={1.5} />
          Batch reports
        </Link>
        {canEdit && (
          <ActionButton variant="primary" onClick={() => setIsOpen(true)} className="flex-1 md:flex-none">
            <Plus {...ICON} />
            Add unit
          </ActionButton>
        )}
      </div>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Register a livestock unit">
        <RegisterBatchForm houses={houses} onSuccess={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
};

export const FlockRowActions = ({ batch, houses, isolationRooms, canEdit = true }: { batch: any, houses: any[], isolationRooms: any[], canEdit?: boolean }) => {
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'mortality' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (reason: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const { deleteBatch } = await import('@/lib/actions/batch-actions');
      const res = await deleteBatch(batch.id, reason);
      if (res.success) {
        setShowDeleteModal(false);
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete batch');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MutationBoundary active={isDeleting} label="Deleting unit…" className="rounded-lg">
    <div className="flex items-center gap-2">
      <Link
        href={`/dashboard/flocks/${batch.id}`}
        className={buttonClass('secondary', 'sm', 'mr-1 h-10')}
      >
        Manage
      </Link>
      {canEdit && (
        <>
          <button
            type="button"
            aria-label="Log mortality"
            title="Log mortality"
            onClick={() => setMode('mortality')}
            className={quickButtonClass('mortality')}
          >
            <Skull {...ROW_ICON} />
          </button>
          <button
            type="button"
            aria-label="Quick sell"
            title="Quick sell"
            onClick={() => router.push(`/dashboard/sales?sellBatchId=${batch.id}`)}
            className={quickButtonClass('sell')}
          >
            <ShoppingCart {...ROW_ICON} />
          </button>
          <button
            type="button"
            aria-label="Edit unit"
            title="Edit unit"
            onClick={() => setMode('edit')}
            className={quickButtonClass('edit')}
          >
            <Pencil {...ROW_ICON} />
          </button>
          <button
            type="button"
            aria-label="Delete unit"
            title="Delete unit"
            onClick={() => setShowDeleteModal(true)}
            className={quickButtonClass('delete')}
          >
            <Trash2 {...ROW_ICON} />
          </button>
        </>
      )}

      <Dialog 
        isOpen={mode !== null} 
        onOpenChange={(open) => !open && setMode(null)} 
        title={mode === 'edit' ? 'Edit unit' : 'Log mortality'}
      >
        {mode && (
            <LivestockForm 
              batch={batch} 
              houses={houses} 
              isolationRooms={isolationRooms}
              mode={mode as any} 
              onClose={() => setMode(null)} 
            />
        )}
      </Dialog>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={batch.batchName || 'Selected livestock unit'}
        isLoading={isDeleting}
      />
    </div>
    </MutationBoundary>
  );
};
