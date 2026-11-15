'use client'

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  DateInput,
  Form,
  FormActions,
  FormError,
  FormRow,
  FormSection,
  FormSummary,
  FormSummaryRow,
  Input,
  SearchSelect,
  Segmented,
} from '@/components/ui/form';
import { createEggProduction, updateEggProduction } from '@/lib/actions/egg-actions';
import { useRouter } from 'next/navigation';
import { formatLivestockType } from '@/lib/utils/growth-utils';

interface EggFormProps {
  batches: { id: string; batchName: string; type: string }[];
  log?: any;
  mode: 'create' | 'edit' | 'delete';
  onClose: () => void;
  defaultBatchId?: string;
  defaultEggUnit?: 'crate' | 'individual';
  allowEggUnitChange?: boolean;
  defaultEggSortMode?: 'sorted' | 'unsorted';
  allowEggSortModeChange?: boolean;
  eggsPerCrate?: number;
}

function unitToLoggingMode(unit: 'crate' | 'individual'): 'individual' | 'crates' {
  return unit === 'crate' ? 'crates' : 'individual';
}

export const EggForm = ({
  batches,
  log,
  mode,
  onClose,
  defaultBatchId,
  defaultEggUnit = 'crate',
  allowEggUnitChange = false,
  defaultEggSortMode = 'unsorted',
  allowEggSortModeChange = false,
  eggsPerCrate = 30,
}: EggFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoggingMode = log
    ? (log.cratesCollected != null ? 'crates' : 'individual')
    : unitToLoggingMode(defaultEggUnit);
  const [loggingMode, setLoggingMode] = useState<'individual' | 'crates'>(initialLoggingMode);
  // A saved log's eggsCollected is every egg laid; the form edits the good eggs.
  const initialGoodEggs = log ? Math.max(0, (log.eggsCollected || 0) - (log.unusableCount || 0)) : 0;
  const [crates, setCrates] = useState(
    initialGoodEggs ? Math.floor(initialGoodEggs / eggsPerCrate) : 0,
  );
  const [remainder, setRemainder] = useState(
    initialGoodEggs ? initialGoodEggs % eggsPerCrate : 0,
  );

  const [formData, setFormData] = useState({
    batchId: log?.batchId || defaultBatchId || (batches[0]?.id || ''),
    eggsCollected: initialGoodEggs,
    unusableCount: log?.unusableCount || 0,
    qualityGrade: log?.qualityGrade || 'MEDIUM',
    isSorted: log?.isSorted ?? (defaultEggSortMode === 'sorted'),
    smallCount: log?.smallCount || 0,
    mediumCount: log?.mediumCount || 0,
    largeCount: log?.largeCount || 0,
    logDate: log?.logDate ? new Date(log.logDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const handleCrateChange = (c: number, r: number) => {
    setCrates(c);
    setRemainder(r);
    setFormData(prev => ({ ...prev, eggsCollected: (c * eggsPerCrate) + r }));
  };

  /** Strips leading zeros as the farmer types and reads the field as a whole number (empty = 0). */
  const readCount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valStr = e.target.value;
    if (valStr.startsWith('0') && valStr.length > 1) {
      valStr = valStr.replace(/^0+/, '');
      e.target.value = valStr;
    }
    return valStr === '' ? 0 : Number(valStr);
  };

  const sortedTotal = formData.smallCount + formData.mediumCount + formData.largeCount;
  const isOverTotal = formData.isSorted && sortedTotal > formData.eggsCollected;
  const remainderMax = Math.max(eggsPerCrate - 1, 0);
  const totalLaid = Number(formData.eggsCollected) + Number(formData.unusableCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverTotal) return;
    setIsLoading(true);
    setError(null);
    try {
      let res: { success?: boolean; error?: string } | undefined;
      if (mode === 'create') {
        res = await createEggProduction({
          ...formData,
          batchId: formData.batchId,
          eggsCollected: Number(formData.eggsCollected),
          unusableCount: Number(formData.unusableCount),
          smallCount: Number(formData.smallCount),
          mediumCount: Number(formData.mediumCount),
          largeCount: Number(formData.largeCount),
        });
      } else if (mode === 'edit') {
        res = await updateEggProduction(log.id, {
          eggsCollected: Number(formData.eggsCollected),
          unusableCount: Number(formData.unusableCount),
          qualityGrade: formData.qualityGrade,
          isSorted: formData.isSorted,
          smallCount: Number(formData.smallCount),
          mediumCount: Number(formData.mediumCount),
          largeCount: Number(formData.largeCount),
          logDate: formData.logDate,
        });
      }
      if (res && res.success === false) {
        setError(res.error || 'The egg record could not be saved. Try again.');
        return;
      }
      toast.success(mode === 'edit' ? 'Egg record updated' : 'Egg record saved');
      onClose();
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError('The egg record could not be saved. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormError>{error}</FormError>

      {mode === 'create' && (
        <SearchSelect
          label="Flock"
          options={batches.map(b => ({ label: b.batchName, description: formatLivestockType(b.type), value: b.id }))}
          value={formData.batchId}
          onChange={(batchId) => setFormData({ ...formData, batchId })}
          placeholder="Select a flock"
          searchPlaceholder="Search flocks"
          emptyText="No flock matches"
          required
        />
      )}

      <FormSection title="Eggs collected">
        {allowEggUnitChange ? (
          <Segmented
            label="Count by"
            value={loggingMode}
            onChange={setLoggingMode}
            options={[
              { value: 'crates', label: `Crates of ${eggsPerCrate}` },
              { value: 'individual', label: 'Single eggs' },
            ]}
          />
        ) : null}

        {loggingMode === 'individual' ? (
          <Input
            label="Good eggs"
            type="number"
            min="0"
            unit="eggs"
            value={formData.eggsCollected}
            onChange={(e) => {
              const val = readCount(e);
              setFormData({ ...formData, eggsCollected: val });
            }}
            onFocus={(e) => e.target.select()}
            required
          />
        ) : (
          <FormRow alwaysInline>
            <Input
              label="Full crates"
              type="number"
              min="0"
              unit="crates"
              value={crates}
              onChange={(e) => {
                const val = readCount(e);
                handleCrateChange(val, remainder);
              }}
              onFocus={(e) => e.target.select()}
              required
            />
            <Input
              label="Loose eggs"
              type="number"
              min="0"
              max={remainderMax}
              unit="eggs"
              value={remainder}
              onChange={(e) => {
                let val = readCount(e);
                if (val > remainderMax) {
                  val = remainderMax;
                  e.target.value = String(remainderMax);
                }
                handleCrateChange(crates, val);
              }}
              onFocus={(e) => e.target.select()}
            />
          </FormRow>
        )}

        <Input
          label="Unusable eggs"
          type="number"
          min="0"
          unit="eggs"
          hint="Cracked or damaged. Counted on top of the good eggs."
          value={formData.unusableCount}
          onChange={(e) => {
            const val = readCount(e);
            setFormData({ ...formData, unusableCount: val });
          }}
          onFocus={(e) => e.target.select()}
        />

        <FormSummary>
          <FormSummaryRow label="Good eggs" value={Number(formData.eggsCollected).toLocaleString()} />
          <FormSummaryRow label="Unusable eggs" value={Number(formData.unusableCount).toLocaleString()} />
          <FormSummaryRow label="Total laid" value={`${totalLaid.toLocaleString()} eggs`} strong />
        </FormSummary>
      </FormSection>

      <FormSection
        title="Egg size"
        aside={
          formData.isSorted ? (
            <span className={isOverTotal ? 'font-medium text-neg' : 'font-medium text-accent'}>
              {sortedTotal.toLocaleString()} of {Number(formData.eggsCollected).toLocaleString()} sorted
            </span>
          ) : undefined
        }
      >
        {allowEggSortModeChange ? (
          <Segmented
            label="Sorted by size?"
            value={formData.isSorted}
            onChange={(isSorted: boolean) =>
              setFormData({
                ...formData,
                isSorted,
                ...(isSorted ? {} : { smallCount: 0, mediumCount: 0, largeCount: 0 }),
              })
            }
            options={[
              { value: false, label: 'Not sorted' },
              { value: true, label: 'Sorted' },
            ]}
          />
        ) : null}

        {!formData.isSorted ? (
          <Segmented
            label="Size of most eggs"
            value={formData.qualityGrade as string}
            onChange={(qualityGrade: string) => setFormData({ ...formData, qualityGrade })}
            options={[
              { label: 'Small', value: 'SMALL' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Large', value: 'LARGE' },
            ]}
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Small"
                type="number"
                min="0"
                value={formData.smallCount}
                onChange={(e) => {
                  const val = readCount(e);
                  const currentTotal = val + formData.mediumCount + formData.largeCount;
                  if (currentTotal > formData.eggsCollected) {
                    return;
                  }
                  setFormData({ ...formData, smallCount: val });
                }}
                onFocus={(e) => e.target.select()}
              />
              <Input
                label="Medium"
                type="number"
                min="0"
                value={formData.mediumCount}
                onChange={(e) => {
                  const val = readCount(e);
                  const currentTotal = formData.smallCount + val + formData.largeCount;
                  if (currentTotal > formData.eggsCollected) {
                    return;
                  }
                  setFormData({ ...formData, mediumCount: val });
                }}
                onFocus={(e) => e.target.select()}
              />
              <Input
                label="Large"
                type="number"
                min="0"
                value={formData.largeCount}
                onChange={(e) => {
                  const val = readCount(e);
                  const currentTotal = formData.smallCount + formData.mediumCount + val;
                  if (currentTotal > formData.eggsCollected) {
                    return;
                  }
                  setFormData({ ...formData, largeCount: val });
                }}
                onFocus={(e) => e.target.select()}
              />
            </div>
            {isOverTotal ? (
              <FormError>The sizes add up to more than the good eggs. Lower one of them.</FormError>
            ) : null}
          </>
        )}
      </FormSection>

      <FormSection title="When">
        <DateInput
          label="Date collected"
          value={formData.logDate}
          onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
          required
        />
      </FormSection>

      <FormActions>
        <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" isLoading={isLoading} loadingText="Saving" disabled={isOverTotal}>
          {mode === 'edit' ? 'Save changes' : 'Save eggs'}
        </Button>
      </FormActions>
    </Form>
  );
};
