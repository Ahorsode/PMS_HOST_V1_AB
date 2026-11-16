'use client'

import React, { useState } from 'react';
import {
  Button,
  DateInput,
  Form,
  FormActions,
  FormError,
  FormSection,
  Input,
  SearchSelect,
} from '@/components/ui/form';
import { createFeedingLog, updateFeedingLog } from '@/lib/actions/feed-actions';
import { useRouter } from 'next/navigation';
import { getBreedDisplayName } from '@/lib/farm/livestock-breed-options';
import { feedSourceFromLog, parseFeedSource } from '@/lib/inventory/feed-source';
import { cn } from '@/lib/utils';

interface FeedFormProps {
  batches: { id: string; breedType: string; batchName?: string | null }[];
  inventory: { id: string; itemName: string }[];
  formulations?: { id: string; name: string }[];
  log?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
  onSaved?: () => void;
  onOptimisticLog?: (batchId: string, amount: number) => void;
  onOptimisticRollback?: (batchId: string, amount: number) => void;
  selectedFormulationId?: string;
}

const QUICK_AMOUNTS = [
  { value: 0.25, label: '¼ bag' },
  { value: 0.5, label: '½ bag' },
  { value: 0.75, label: '¾ bag' },
  { value: 1, label: '1 bag' },
];

export const FeedForm = ({
  batches, inventory, formulations = [], log, mode,
  onClose, onSaved, onOptimisticLog, onOptimisticRollback,
  selectedFormulationId,
}: FeedFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feedOptions = [
    ...inventory.map(i => ({ label: i.itemName, description: 'From your feed stock', value: `inv_${i.id}` })),
    ...formulations.map(f => ({ label: f.name, description: 'Your own feed mix', value: `form_${f.id}` }))
  ];

  const defaultFeedSource = selectedFormulationId
    ? `form_${selectedFormulationId}`
    : (log ? feedSourceFromLog(log) : feedOptions[0]?.value || '');

  const [formData, setFormData] = useState({
    batchId: log?.batchId || (batches[0]?.id || ''),
    feedSource: defaultFeedSource,
    amountConsumed: log?.amountConsumed ?? '',
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.batchId) {
      setError('Choose the flock that was fed.');
      return;
    }

    const amount = Number(formData.amountConsumed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter how many bags were used. It must be more than zero.');
      return;
    }

    const { feedTypeId, formulationId } = parseFeedSource(formData.feedSource);
    if (!feedTypeId && !formulationId) {
      setError('Choose the feed that was used.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'create') {
        onOptimisticLog?.(formData.batchId, amount);
        const res = await createFeedingLog({
          batchId: formData.batchId,
          feedTypeId,
          formulationId,
          amountConsumed: amount,
          logDate: formData.logDate,
        });
        if (!res?.success) {
          onOptimisticRollback?.(formData.batchId, amount);
          setError(res?.error || 'The feeding could not be saved. Try again.');
          return;
        }
      } else if (mode === 'edit') {
        const res = await updateFeedingLog(log.id, {
          amountConsumed: amount,
          feedTypeId,
          formulationId,
        });
        if (!res?.success) {
          setError(res?.error || 'The feeding could not be updated. Try again.');
          return;
        }
      }
      onClose();
      onSaved?.();
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      if (mode === 'create') {
        onOptimisticRollback?.(formData.batchId, amount);
      }
      setError('The feeding could not be saved. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (feedOptions.length === 0) {
    return (
      <div className="space-y-5 py-2">
        <div className="space-y-1.5 text-center">
          <p className="text-base font-semibold text-fg">No feed to record yet</p>
          <p className="text-sm leading-6 text-fg-2">
            Add a feed item to your stock, or create a feed mix, and you can record feedings here.
          </p>
        </div>
        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              router.push('/dashboard/feed');
            }}
          >
            Create feed mix
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={() => {
              onClose();
              router.push('/dashboard/inventory');
            }}
          >
            Add feed stock
          </Button>
        </FormActions>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="space-y-5 py-2">
        <div className="space-y-1.5 text-center">
          <p className="text-base font-semibold text-fg">No active flocks</p>
          <p className="text-sm leading-6 text-fg-2">
            Add a flock, or make one active, before recording a feeding.
          </p>
        </div>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </FormActions>
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormError>{error}</FormError>

      <FormSection title="What was fed">
        <SearchSelect
          label="Flock"
          options={batches.map((b, index) => ({
            label: b.batchName || `Unit ${index + 1}`,
            description: getBreedDisplayName(b.breedType),
            value: b.id,
          }))}
          value={formData.batchId}
          onChange={(batchId) => setFormData({ ...formData, batchId })}
          placeholder="Select a flock"
          searchPlaceholder="Search flocks"
          emptyText="No flock matches"
          disabled={mode === 'edit'}
          required
        />
        <SearchSelect
          label="Feed"
          options={feedOptions}
          value={formData.feedSource}
          onChange={(feedSource) => setFormData({ ...formData, feedSource })}
          placeholder="Select a feed"
          searchPlaceholder="Search feed"
          emptyText="No feed matches"
          disabled={mode === 'edit'}
          required
        />
      </FormSection>

      <FormSection title="How much">
        <div className="space-y-2">
          <Input
            label="Bags used"
            type="number"
            min="0"
            step="0.01"
            unit="bags"
            placeholder="e.g. 2.5"
            value={formData.amountConsumed}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val < 0) return;
              setFormData({ ...formData, amountConsumed: e.target.value === '' ? '' : val });
            }}
            required
          />
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick amounts">
            {QUICK_AMOUNTS.map((quick) => {
              const selected = Number(formData.amountConsumed) === quick.value;
              return (
                <button
                  key={quick.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFormData({ ...formData, amountConsumed: quick.value })}
                  className={cn(
                    'min-h-11 rounded-lg border px-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                    selected
                      ? 'border-accent bg-accent font-semibold text-accent-fg'
                      : 'border-fg/[0.14] bg-page text-fg-2 hover:border-fg/25 hover:text-fg',
                  )}
                >
                  {quick.label}
                </button>
              );
            })}
          </div>
        </div>
      </FormSection>

      <FormSection title="When">
        <DateInput
          label="Date fed"
          value={formData.logDate}
          onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
          disabled={mode === 'edit'}
          hint={mode === 'edit' ? 'The date of a saved feeding cannot be changed.' : undefined}
          required
        />
      </FormSection>

      <FormActions>
        <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" isLoading={isLoading} loadingText="Saving">
          {mode === 'edit' ? 'Save changes' : 'Save feeding'}
        </Button>
      </FormActions>
    </Form>
  );
};
