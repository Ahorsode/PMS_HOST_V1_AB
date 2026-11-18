'use client'

import React, { useState } from 'react';
import {
  BreedSelect,
  Button,
  DateInput,
  Form,
  FormActions,
  FormRow,
  FormSection,
  Input,
  MoreDetails,
  Segmented,
  Select,
} from '@/components/ui/form';
import { getLivestockUnit } from '@/lib/utils/growth-utils';
import { createBatch, updateBatch, logHealthEvent } from '@/lib/actions/batch-actions';
import { createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Activity, Skull } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getBreedOptionsForCategory,
  LIVESTOCK_CATEGORY_OPTIONS,
  normalizeBreedValue,
} from '@/lib/farm/livestock-breed-options';

interface LivestockFormProps {
  houses: { id: string; name: string }[];
  isolationRooms?: { id: string; name: string; capacity: number }[];
  batch?: any;
  mode: 'create' | 'edit' | 'delete' | 'mortality';
  defaultHealthType?: 'DEAD' | 'SICK';
  onClose: () => void;
}

/** Causes and their details for deaths and sick birds; also used by the phone quarantine sheets. */
export const MORTALITY_REASONS: Record<string, string[]> = {
  "Disease": ["Newcastle disease", "Avian influenza", "Gumboro", "Marek’s disease", "Salmonellosis", "Fowl cholera", "Colibacillosis", "Coccidiosis", "Worm infestation"],
  "Environmental": ["Heat stress", "Cold stress", "Poor ventilation", "High ammonia", "Overcrowding"],
  "Nutrition": ["Malnutrition", "Vitamin deficiency", "Moldy feed", "Poor-quality feed"],
  "Water Issues": ["Dirty water", "Dehydration", "Water system failure"],
  "Parasites": ["Mites", "Lice", "Ticks", "Worms"],
  "Management Error": ["Poor vaccination", "Mixing age groups", "Rough handling", "Poor biosecurity"],
  "Toxicity": ["Aflatoxin", "Chemical poisoning", "Drug overdose"],
  "Predators": ["Dog attack", "Snake attack", "Bird attack"],
  "Stress": ["Transport stress", "Noise stress", "Environmental change"],
  "Brooding": ["Wrong temperature", "Weak chicks", "Poor brooding care"],
  "Genetic": ["Weak breed", "Birth defect"],
  "Injury/Accident": ["Cannibalism", "Trampling", "Equipment injury"],
  "Unknown": ["Unknown cause yet"],
  "Other": ["Other"]
};

export const LivestockForm = ({ houses, isolationRooms = [], batch, mode, defaultHealthType, onClose }: LivestockFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    houseId: batch?.houseId || (houses[0]?.id || ''),
    batchName: batch?.batchName || '',
    type: batch?.type || 'POULTRY_BROILER',
    breedType: normalizeBreedValue(batch?.breedType) || 'ross_308',
    initialCount: batch?.initialCount || '' as number | '',
    growthTargetOverride: batch?.growthTargetOverride || '',
    arrivalDate: batch?.arrivalDate ? new Date(batch.arrivalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: batch?.status || 'active',
    mortalityCount: '',
    category: mode === 'mortality' ? 'Unknown' : '',
    subCategory: mode === 'mortality' ? 'Unknown cause yet' : '',
    reason: '',
    healthType: defaultHealthType || ('DEAD' as 'SICK' | 'DEAD'),
    isolationRoomId: mode === 'mortality' ? (isolationRooms[0]?.id?.toString() || '') : '',
    newRoomName: '',
    newRoomCapacity: '',
  });
  const breedOptions = React.useMemo(() => getBreedOptionsForCategory(formData.type), [formData.type]);

  React.useEffect(() => {
    const firstBreed = breedOptions[0]?.value ?? '';
    const hasSelectedBreed = breedOptions.some((option) => option.value === formData.breedType);

    if (firstBreed && !hasSelectedBreed) {
      setFormData((current) => ({ ...current, breedType: firstBreed }));
    }

    if (!firstBreed && formData.breedType) {
      setFormData((current) => ({ ...current, breedType: '' }));
    }
  }, [breedOptions, formData.breedType]);

  React.useEffect(() => {
    if (mode !== 'mortality' || formData.healthType !== 'SICK' || formData.isolationRoomId) return;
    const firstRoomId = isolationRooms[0]?.id?.toString();
    if (!firstRoomId) return;
    setFormData((current) => ({ ...current, isolationRoomId: firstRoomId }));
  }, [mode, formData.healthType, formData.isolationRoomId, isolationRooms]);

  const handleSubmit = async (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      let res;
      if (mode === 'create') {
        res = await createBatch({
          houseId: String(formData.houseId),
          batchName: formData.batchName,
          breedType: normalizeBreedValue(formData.breedType),
          type: formData.type as any,
          initialCount: Number(formData.initialCount) || 0,
          arrivalDate: formData.arrivalDate,
        });
      } else if (mode === 'edit') {
        res = await updateBatch(batch.id, {
          houseId: String(formData.houseId),
          batchName: formData.batchName,
          breedType: normalizeBreedValue(formData.breedType),
          type: formData.type as any,
          growthTargetOverride: formData.growthTargetOverride,
          initialCount: Number(formData.initialCount) || 0,
          arrivalDate: formData.arrivalDate,
          status: formData.status,
        });
      } else if (mode === 'mortality') {
        let finalIsolationRoomId = formData.isolationRoomId;
        
        // Handle dynamic room creation
        if (formData.healthType === 'SICK' && formData.isolationRoomId === 'add_new') {
          if (!formData.newRoomName) {
            toast.error("Enter a name for the new room");
            setIsLoading(false);
            return;
          }
          const roomRes = await createIsolationRoom({
            name: formData.newRoomName,
            capacity: Number(formData.newRoomCapacity) || 0
          });
          if (roomRes.success) {
            finalIsolationRoomId = (roomRes.room as any).id.toString();
          } else {
            toast.error(roomRes.error || "The new room could not be added");
            setIsLoading(false);
            return;
          }
        }

        res = await logHealthEvent({
          batchId: batch.id,
          type: formData.healthType,
          count: Number(formData.mortalityCount) || 0,
          isolationRoomId: formData.healthType === 'SICK' ? String(finalIsolationRoomId) : undefined,
          category: formData.category,
          subCategory: formData.category === 'Unknown' ? 'Unknown cause yet' : formData.subCategory,
          reason: formData.reason,
          logDate: new Date().toISOString(),
        });
      }

      if (res?.success) {
        toast.success(mode === 'create' ? 'Flock added' : mode === 'edit' ? 'Flock updated' : formData.healthType === 'SICK' ? 'Birds moved to isolation' : 'Deaths recorded');
        onClose();
        router.refresh();
      } else {
        toast.error(res?.error || 'That could not be saved. Try again.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const currentRemaining = batch?.currentCount || 0;
  const isMortalityExceeded = mode === 'mortality' && Number(formData.mortalityCount) > currentRemaining;
  const isSick = formData.healthType === 'SICK';
  const unitLabel = getLivestockUnit(mode === 'mortality' ? batch?.type : formData.type);

  return (
    <Form onSubmit={handleSubmit}>
      <fieldset disabled={isLoading} className="min-w-0 space-y-6">
        {mode === 'mortality' ? (
          <>
            {!defaultHealthType && (
              <Segmented
                label="What happened"
                value={formData.healthType}
                onChange={(healthType: 'DEAD' | 'SICK') => setFormData({ ...formData, healthType })}
                options={[
                  { value: 'DEAD', label: 'Died', icon: <Skull className="h-4 w-4" strokeWidth={1.75} /> },
                  { value: 'SICK', label: 'Sick', icon: <Activity className="h-4 w-4" strokeWidth={1.75} /> },
                ]}
              />
            )}

            <FormSection title="How many">
              <Input
                label={isSick ? 'Sick birds' : 'Birds that died'}
                type="number"
                min="0"
                unit={unitLabel}
                value={formData.mortalityCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > currentRemaining) {
                    return;
                  }
                  setFormData({ ...formData, mortalityCount: e.target.value });
                }}
                required
                placeholder="e.g. 3"
                hint={`${currentRemaining.toLocaleString()} in this flock now`}
                error={
                  isMortalityExceeded
                    ? `Only ${currentRemaining.toLocaleString()} are left in this flock. Enter a smaller number.`
                    : undefined
                }
              />

              {/* Health Details: Isolation Room (Show only if not DEAD) */}
              {isSick && (
                <>
                  <Select
                    label="Move to isolation room"
                    optional
                    options={[
                      { label: 'No room', value: '' },
                      ...isolationRooms.map(room => ({ label: `${room.name} (holds ${room.capacity})`, value: room.id.toString() })),
                      { label: 'Add a new room', value: 'add_new' }
                    ]}
                    value={formData.isolationRoomId}
                    onChange={(e) => setFormData({ ...formData, isolationRoomId: e.target.value })}
                  />

                  {formData.isolationRoomId === 'add_new' && (
                    <FormRow alwaysInline className="rounded-xl border border-fg/[0.08] bg-tile p-3">
                      <Input
                        label="New room name"
                        placeholder="e.g. Room A"
                        value={formData.newRoomName}
                        onChange={(e) => setFormData({ ...formData, newRoomName: e.target.value })}
                        required
                      />
                      <Input
                        label="Holds"
                        type="number"
                        unit="birds"
                        placeholder="e.g. 50"
                        value={formData.newRoomCapacity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val < 0) return;
                          setFormData({ ...formData, newRoomCapacity: e.target.value });
                        }}
                        required
                      />
                    </FormRow>
                  )}
                </>
              )}
            </FormSection>

            <FormSection title="Why">
              <Select
                label="Cause"
                options={[
                  { label: 'Select a cause', value: '' },
                  ...Object.keys(MORTALITY_REASONS).map(cat => ({ label: cat, value: cat }))
                ]}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
                required
              />
              {formData.category && formData.category !== 'Unknown' && (
                <Select
                  label="What exactly"
                  options={[
                    { label: 'Select one', value: '' },
                    ...MORTALITY_REASONS[formData.category].map(sub => ({ label: sub, value: sub }))
                  ]}
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  required
                />
              )}
              <Input
                label="Notes"
                optional
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g. Found near the drinkers"
              />
            </FormSection>
          </>
        ) : (
          <>
            <FormSection title="Flock details">
              <Input
                label="Flock name"
                value={formData.batchName}
                onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                required
                placeholder="e.g. Broilers March"
              />
              <FormRow>
                <Select
                  label="Kind of livestock"
                  options={[...LIVESTOCK_CATEGORY_OPTIONS]}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
                <BreedSelect
                  label="Breed"
                  options={breedOptions}
                  value={formData.breedType}
                  onChange={(breedType) => setFormData({ ...formData, breedType })}
                  required
                />
              </FormRow>
              <Select
                label="House"
                options={houses.map(h => ({ label: h.name, value: h.id }))}
                value={formData.houseId}
                onChange={(e) => setFormData({ ...formData, houseId: e.target.value })}
                required
              />
            </FormSection>

            <FormSection title="How many and when">
              <FormRow>
                <Input
                  label="Number at arrival"
                  type="number"
                  min="0"
                  unit={unitLabel}
                  value={formData.initialCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < 0) return;
                    setFormData({ ...formData, initialCount: e.target.value === '' ? '' : val });
                  }}
                  required
                  placeholder="e.g. 1000"
                />
                <DateInput
                  label="Arrival date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                  required
                />
              </FormRow>
            </FormSection>

            {mode === 'edit' && (
              <FormSection title="Status">
                <Segmented
                  label="Is this flock still on the farm?"
                  value={formData.status as string}
                  onChange={(status: string) => setFormData({ ...formData, status })}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Completed', value: 'completed' },
                  ]}
                />
                <MoreDetails label="Growth target">
                  <Select
                    label="Compare growth against"
                    hint="Leave on the default to use the breed's own target."
                    options={[
                      { label: 'Default (from breed)', value: '' },
                      { label: 'Ross 308 (meat)', value: 'Ross 308' },
                      { label: 'Cobb 500 (meat)', value: 'Cobb 500' },
                      { label: 'ISA Brown (eggs)', value: 'ISA Brown' },
                      { label: 'Lohmann (eggs)', value: 'Lohmann' },
                      { label: 'Ankole (cattle)', value: 'Ankole' },
                    ]}
                    value={formData.growthTargetOverride}
                    onChange={(e) => setFormData({ ...formData, growthTargetOverride: e.target.value })}
                  />
                </MoreDetails>
              </FormSection>
            )}
          </>
        )}
      </fieldset>

      <FormActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="accent"
          isLoading={isLoading}
          loadingText={mode === 'create' ? 'Adding flock' : mode === 'edit' ? 'Saving' : isSick ? 'Moving birds' : 'Saving'}
          disabled={isMortalityExceeded}
        >
          {mode === 'create' ? 'Add flock' : mode === 'edit' ? 'Save changes' : isSick ? 'Move to isolation' : 'Record deaths'}
        </Button>
      </FormActions>
    </Form>
  );
};
