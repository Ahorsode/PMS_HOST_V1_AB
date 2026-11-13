'use client'

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUpRight, BarChart3 } from 'lucide-react';
import { g } from '@/components/ui/graphite';
import { Dialog } from '@/components/ui/Dialog';
import { EggForm } from './EggForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';

type EggLoggingSettings = {
  defaultEggUnit?: 'crate' | 'individual';
  allowEggUnitChange?: boolean;
  defaultEggSortMode?: 'sorted' | 'unsorted';
  allowEggSortModeChange?: boolean;
  eggsPerCrate?: number;
};

export const EggActionsHeader = ({
  batches,
  canEdit = true,
  initialOpen = false,
  ...eggSettings
}: {
  batches: any[];
  canEdit?: boolean;
  initialOpen?: boolean;
} & EggLoggingSettings) => {
  const [isOpen, setIsOpen] = useState(initialOpen && canEdit);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/eggs/analytics" className={g.buttonSecondary}>
          <BarChart3 className="h-4 w-4 text-fg-2" strokeWidth={1.5} />
          Egg analytics
        </Link>
        {canEdit && (
          <button type="button" onClick={() => setIsOpen(true)} className={g.buttonPrimary}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Log production
          </button>
        )}
      </div>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Log egg production">
        <EggForm batches={batches} mode="create" onClose={() => setIsOpen(false)} {...eggSettings} />
      </Dialog>
    </>
  );
};

const ROW_ICON = QUICK_ICON;

export const EggLogActions = ({
  log,
  batches,
  canEdit = true,
  ...eggSettings
}: {
  log: any;
  batches: any[];
  canEdit?: boolean;
} & EggLoggingSettings) => {
  const [mode, setMode] = useState<'edit' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (reason: string) => {
    setIsDeleting(true);
    try {
      const { deleteEggProduction } = await import('@/lib/actions/egg-actions');
      const res = await deleteEggProduction(log.id, reason);
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
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/dashboard/flocks/${log.batchId}`}
        className={quickButtonClass('open')}
        title="Open batch"
        aria-label="Open batch"
      >
        <ArrowUpRight {...ROW_ICON} />
      </Link>
      {canEdit && (
        <>
          <button
            type="button"
            aria-label="Edit egg record"
            title="Edit"
            onClick={() => setMode('edit')}
            className={quickButtonClass('edit')}
          >
            <Pencil {...ROW_ICON} />
          </button>
          <button
            type="button"
            aria-label="Delete egg record"
            title="Delete"
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
        title="Edit production log"
      >
        {mode && (
          <EggForm 
            log={log} 
            batches={batches} 
            mode={mode} 
            onClose={() => setMode(null)}
            {...eggSettings}
          />
        )}
      </Dialog>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={`Egg collection log (${new Date(log.logDate).toLocaleDateString()})`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export const LogProductionButton = ({
  batchId,
  batches,
  canEdit = true,
  ...eggSettings
}: {
  batchId: string;
  batches: any[];
  canEdit?: boolean;
} & EggLoggingSettings) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {canEdit && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Log production"
          className={`${g.buttonSecondary} h-8 px-3`}
        >
          <span className="sm:hidden">Log</span>
          <span className="hidden sm:inline">Log production</span>
        </button>
      )}
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Log egg production">
        <EggForm 
          batches={batches} 
          mode="create" 
          defaultBatchId={batchId} 
          onClose={() => setIsOpen(false)}
          {...eggSettings}
        />
      </Dialog>
    </>
  );
};
