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
import { Check, CalendarDays } from 'lucide-react';
import { useIsPhone } from '@/components/ui/ql/useIsPhone';
import { QlStepper } from '@/components/ui/ql/Stepper';
import { QlLabel } from '@/components/ui/ql/Surface';
import { QlDerived } from '@/components/ui/ql/Derived';

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
  // Phones get batch cards, a stepper and a running stock figure (Quiet Ledger);
  // the values and checks are the same as the typed fields.
  const phone = useIsPhone();
  const [pickDate, setPickDate] = useState(false);
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

  const selectedStock = (() => {
    const { feedTypeId, formulationId } = parseFeedSource(formData.feedSource);
    // Stock rows carry stockLevel and unit at run time; the prop types only name id and label.
    const source = (feedTypeId
      ? inventory.find((item) => item.id === feedTypeId)
      : formulations.find((formulation) => formulation.id === formulationId)) as
      | { stockLevel?: number | string | null; unit?: string | null }
      | undefined;
    if (!source || source.stockLevel == null) return null;
    return { level: Number(source.stockLevel), unit: source.unit || 'bags' };
  })();
  const amountNumber = Number(formData.amountConsumed) || 0;
  const todayValue = new Date().toISOString().split('T')[0];
  const yesterdayValue = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const dateChoice = formData.logDate === todayValue ? 'today' : formData.logDate === yesterdayValue ? 'yesterday' : 'pick';
  const dateChip = (active: boolean) =>
    cn(
      'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60 disabled:cursor-not-allowed disabled:opacity-50',
      active ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-text',
    );
  const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  if (phone) {
    return (
      <Form onSubmit={handleSubmit}>
        <FormError>{error}</FormError>

        <div className="font-ql-sans text-ql-text">
          <QlLabel>Batch</QlLabel>
          {mode === 'create' && batches.length <= 4 ? (
            <div role="radiogroup" aria-label="Flock" className="mt-2 grid grid-cols-2 gap-2">
              {batches.map((b, index) => {
                const selected = formData.batchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFormData({ ...formData, batchId: b.id })}
                    className={cn(
                      'relative min-h-14 rounded-2xl border px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
                      selected ? 'border-ql-mint/60 bg-ql-mint/[0.06]' : 'border-ql-line bg-ql-surface',
                    )}
                  >
                    <span className="block truncate pr-5 text-sm font-semibold">{b.batchName || `Unit ${index + 1}`}</span>
                    <span className="block truncate text-[12px] text-ql-muted">{getBreedDisplayName(b.breedType) || 'Active'}</span>
                    {selected ? <Check aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-ql-mint" strokeWidth={2.5} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        {mode === 'edit' || batches.length > 4 ? (
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
        ) : null}

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
        {selectedStock ? (
          <p className="-mt-2 font-ql-mono text-[11px] text-ql-muted">
            {nf(selectedStock.level)} {selectedStock.unit} in stock
          </p>
        ) : null}

        <div className="space-y-2">
          <QlStepper
            label="Bags fed"
            hint="Taken from stock"
            decimals
            unit="bags"
            value={amountNumber}
            onChange={(value) => setFormData({ ...formData, amountConsumed: value === 0 ? '' : value })}
          />
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick amounts">
            {QUICK_AMOUNTS.map((quick) => {
              const selected = amountNumber === quick.value;
              return (
                <button
                  key={quick.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFormData({ ...formData, amountConsumed: quick.value })}
                  className={cn(
                    'min-h-11 rounded-xl border px-1 font-ql-sans text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60',
                    selected ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
                  )}
                >
                  {quick.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="font-ql-sans">
          <QlLabel>Date</QlLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={mode === 'edit'} className={dateChip(dateChoice === 'today' && !pickDate)} onClick={() => { setPickDate(false); setFormData({ ...formData, logDate: todayValue }); }}>
              Today
            </button>
            <button type="button" disabled={mode === 'edit'} className={dateChip(dateChoice === 'yesterday' && !pickDate)} onClick={() => { setPickDate(false); setFormData({ ...formData, logDate: yesterdayValue }); }}>
              Yesterday
            </button>
            <button type="button" disabled={mode === 'edit'} className={dateChip(pickDate || dateChoice === 'pick')} onClick={() => setPickDate(true)}>
              <CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              Pick date
            </button>
          </div>
          {mode === 'edit' ? <p className="mt-2 text-[12px] text-ql-muted">The date of a saved feeding cannot be changed.</p> : null}
        </div>
        {(pickDate || dateChoice === 'pick') && mode === 'create' ? (
          <DateInput label="Date fed" value={formData.logDate} onChange={(e) => setFormData({ ...formData, logDate: e.target.value })} required />
        ) : null}

        {mode === 'create' && selectedStock ? (
          <div className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent),transparent_60%)] p-4 font-ql-sans text-ql-text">
            <QlLabel>After this log</QlLabel>
            <p className={cn('mt-3 font-ql-display text-[34px] font-semibold leading-none tabular-nums', selectedStock.level - amountNumber < 0 && 'text-ql-coral')}>
              <QlDerived formula={`${nf(selectedStock.level)} − ${nf(amountNumber)}`}>{nf(selectedStock.level - amountNumber)}</QlDerived>{' '}
              <span className="font-ql-sans text-base font-normal text-ql-muted">{selectedStock.unit} left</span>
            </p>
            <p className="mt-2 font-ql-mono text-[11px] text-ql-muted">{nf(selectedStock.level)} − {nf(amountNumber)}</p>
            {selectedStock.level - amountNumber < 0 ? (
              <p className="mt-2 text-[13px] text-ql-amber">That is more than the {nf(selectedStock.level)} {selectedStock.unit} in stock.</p>
            ) : null}
          </div>
        ) : null}

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
