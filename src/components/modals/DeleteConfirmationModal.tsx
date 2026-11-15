'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Form, FormActions, Textarea } from '@/components/ui/form';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  description?: string;
  itemName?: string;
  isLoading?: boolean;
}

/**
 * The shared confirmation for anything destructive. It asks for a reason and
 * keeps the red button away from Cancel.
 */
export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete this item?",
  description = "It will be moved to the trash. Tell us why you are deleting it so there is a record.",
  itemName,
  isLoading = false
}: DeleteConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isLoading) return;
    if (!reason.trim()) {
      setError("Enter a reason for deleting this item.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Add a few more words so the reason is clear.");
      return;
    }
    setError("");
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    if (isLoading) return;
    setReason("");
    setError("");
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={title}
      description={description}
      className="max-w-md"
    >
      <Form onSubmit={handleConfirm} noValidate>
        {itemName ? (
          <p className="rounded-lg border border-fg/[0.08] bg-tile px-3.5 py-3 text-sm font-medium text-fg">
            {itemName}
          </p>
        ) : null}
        <Textarea
          label="Reason for deleting"
          required
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g. Entered twice, wrong amount, customer cancelled"
          error={error || undefined}
          disabled={isLoading}
          rows={3}
        />
        <FormActions destructive>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="dangerSolid"
            isLoading={isLoading}
            loadingText="Deleting"
            disabled={!reason.trim()}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            Delete
          </Button>
        </FormActions>
      </Form>
    </Dialog>
  );
}
