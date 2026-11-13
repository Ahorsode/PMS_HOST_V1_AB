"use client";

import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBatch } from '@/lib/actions/batch-actions';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BreedSelect } from '@/components/ui/BreedSelect';
import { Button } from '@/components/ui/Button';
import { getBreedOptionsForCategory, LIVESTOCK_CATEGORY_OPTIONS, normalizeBreedValue } from '@/lib/livestock-breed-options';

import { FinancialInitializationModal } from '@/components/modals/FinancialInitializationModal';
import { LivestockType } from '@prisma/client';
import { createHouse } from '@/lib/actions/dashboard-actions';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { MutationBoundary } from '@/components/ui/MutationFeedback';

const formSchema = z.object({
  batchName: z.string().min(2, "Unit Name is required"),
  type: z.nativeEnum(LivestockType),
  breed: z.string().min(1, "Breed is required"),
  initialQuantity: z.number().min(1, "Quantity must be at least 1"),
  hatchDate: z.string().min(1, "Arrival date is required"),
  houseId: z.string().min(1, "House selection is required"),
  vaccinationDate: z.string().optional(),
  vaccineName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RegisterBatchFormProps {
  houses: Array<{
    id: string | number;
    name: string;
  }>;
  onSuccess?: () => void;
}

export function RegisterBatchForm({ houses, onSuccess }: RegisterBatchFormProps) {
  const router = useRouter();
  // Houses made from this form show up straight away, before router.refresh() lands.
  const [createdHouses, setCreatedHouses] = React.useState<Array<{ id: string; name: string }>>([]);
  const allHouses = React.useMemo(() => {
    const known = new Set(houses.map((h) => h.id.toString()));
    return [...houses, ...createdHouses.filter((h) => !known.has(h.id))];
  }, [houses, createdHouses]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showFinModal, setShowFinModal] = React.useState(false);
  const [createdBatchId, setCreatedBatchId] = React.useState<string | null>(null);
  const [createdBatchName, setCreatedBatchName] = React.useState("");
  const [showHouseModal, setShowHouseModal] = React.useState(false);
  const [isCreatingHouse, setIsCreatingHouse] = React.useState(false);
  const [newHouseData, setNewHouseData] = React.useState({ name: '', capacity: '' });
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: LivestockType.POULTRY_BROILER,
      breed: "ross_308",
    },
  });

  const selectedType = watch("type");
  const selectedBreed = watch("breed");
  const selectedHouseId = watch("houseId");
  const breedOptions = React.useMemo(() => getBreedOptionsForCategory(selectedType), [selectedType]);

  React.useEffect(() => {
    if (selectedHouseId === "NEW_HOUSE") {
      setShowHouseModal(true);
      setValue("houseId", ""); // Reset dropdown to placeholder
    }
  }, [selectedHouseId, setValue]);

  React.useEffect(() => {
    const firstBreed = breedOptions[0]?.value ?? "";
    const hasSelectedBreed = breedOptions.some((option) => option.value === selectedBreed);

    if (firstBreed && !hasSelectedBreed) {
      setValue("breed", firstBreed, { shouldDirty: true, shouldValidate: true });
    }

    if (!firstBreed && selectedBreed) {
      setValue("breed", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [breedOptions, selectedBreed, setValue]);

  const handleCreateHouse = async () => {
    if (isCreatingHouse) return;
    if (!newHouseData.name || !newHouseData.capacity) {
      toast.error("Please fill in house name and capacity");
      return;
    }
    setIsCreatingHouse(true);
    try {
      const res = await createHouse({
        houseNumber: newHouseData.name,
        capacity: parseInt(newHouseData.capacity)
      });
      if (res.success && res.house) {
        const created = { id: String(res.house.id), name: String(res.house.name ?? newHouseData.name) };
        setCreatedHouses((prev) => [...prev, created]);
        toast.success("House created. Now register your livestock.");
        setShowHouseModal(false);
        setNewHouseData({ name: '', capacity: '' });
        // Wait a tick so the new option exists before selecting it.
        setTimeout(() => setValue("houseId", created.id, { shouldValidate: true }), 0);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create house");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreatingHouse(false);
    }
  };

  const houseFields = (
    <>
      <Input
        label="House name / number"
        placeholder="e.g. House Alpha, Pen 1"
        value={newHouseData.name}
        onChange={e => setNewHouseData(p => ({ ...p, name: e.target.value }))}
        disabled={isCreatingHouse}
      />
      <Input
        label="Total capacity (birds/heads)"
        type="number"
        min="1"
        placeholder="e.g. 500"
        value={newHouseData.capacity}
        onChange={e => setNewHouseData(p => ({ ...p, capacity: e.target.value }))}
        disabled={isCreatingHouse}
      />
    </>
  );

  // First house: collect it right here, then this same pop-up moves on to
  // the livestock form, instead of sending a new farm off to the Houses page.
  if (allHouses.length === 0) {
    return (
      <div className="w-full max-w-lg">
        <MutationBoundary active={isCreatingHouse} label="Creating house...">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-fg-3">Step 1 of 2</p>
              <h3 className="mt-1 text-base font-medium text-fg">Add your first house</h3>
              <p className="mt-1 text-sm text-fg-3">Livestock needs a house. Add one now and you'll go straight on to registering the birds.</p>
            </div>
            {houseFields}
            <Button
              onClick={handleCreateHouse}
              isLoading={isCreatingHouse}
              loadingText="Creating..."
              className="w-full bg-fg hover:bg-fg/90 text-page font-medium h-12 rounded-lg"
            >
              Save house & continue
            </Button>
          </div>
        </MutationBoundary>
      </div>
    );
  }

  const houseOptions = allHouses.map(h => ({ label: h.name, value: h.id.toString() }));
  
  const onSubmit = async (data: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createBatch({
        houseId: data.houseId,
        breedType: normalizeBreedValue(data.breed),
        initialCount: data.initialQuantity,
        arrivalDate: data.hatchDate,
        batchName: data.batchName,
        type: data.type,
      });

      if (result.success && result.id) {
        setCreatedBatchId(result.id.toString());
        setCreatedBatchName(data.batchName);
        setShowFinModal(true);
        router.refresh();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinModalClose = () => {
    setShowFinModal(false);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <MutationBoundary active={isSubmitting} label="Registering livestock unit...">
        <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Unit name / identity"
              placeholder="e.g., Q1-Broiler-Alpha"
              {...register("batchName")}
              error={errors.batchName?.message}
            />

            <Select
              label="Livestock category"
              options={[...LIVESTOCK_CATEGORY_OPTIONS]}
              {...register("type")}
              error={errors.type?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Controller
              name="breed"
              control={control}
              render={({ field }) => (
                <BreedSelect
                  label="Primary breed / specie"
                  options={breedOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.breed?.message}
                  required
                />
              )}
            />

            <Input
              label="Initial quantity"
              type="number"
              min="1"
              placeholder="1000"
              {...register("initialQuantity", { valueAsNumber: true })}
              error={errors.initialQuantity?.message}
            />
          </div>

            <Select
              label="Farm house"
              options={[
                { label: "Select house location", value: "" }, 
                ...houseOptions,
                { label: "+ Add new house", value: "NEW_HOUSE" }
              ]}
              {...register("houseId")}
              error={errors.houseId?.message}
            />

          <Input
            label="Arrival / hatch date"
            type="date"
            {...register("hatchDate")}
            error={errors.hatchDate?.message}
          />

          <div className="border-t border-fg/10 pt-3 mt-2">
            <h3 className="text-sm font-medium text-fg mb-3 text-xs">Optional initial schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="1st vaccination date"
                type="date"
                {...register("vaccinationDate")}
              />
              <Input
                label="Vaccine name"
                placeholder="e.g., Gumboro"
                {...register("vaccineName")}
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Registering unit..."
              className="w-full bg-fg hover:bg-fg/90 text-page font-medium h-14 rounded-lg transition-colors"
            >
              Register unit & continue
            </Button>
          </div>
        </fieldset>
        </MutationBoundary>
      </form>

      {createdBatchId && (
        <FinancialInitializationModal 
          isOpen={showFinModal}
          onClose={handleFinModalClose}
          batchId={createdBatchId}
          batchName={createdBatchName}
          quantity={watch("initialQuantity") || 0}
        />
      )}

      <Dialog
        isOpen={showHouseModal}
        onOpenChange={(open) => !isCreatingHouse && setShowHouseModal(open)}
        title="Create new farm house"
        description="Add a new housing unit to your farm to accommodate this livestock unit."
      >
        <MutationBoundary active={isCreatingHouse} label="Creating house...">
        <div className="space-y-4 pt-3">
          {houseFields}
          <div className="flex gap-2 pt-2">
             <Button variant="secondary" onClick={() => setShowHouseModal(false)} disabled={isCreatingHouse} className="flex-1">Cancel</Button>
             <Button 
               onClick={handleCreateHouse} 
               isLoading={isCreatingHouse}
               loadingText="Creating..."
               className="flex-1 bg-fg hover:bg-fg/90 text-page font-medium"
             >
               Create house
             </Button>
          </div>
        </div>
        </MutationBoundary>
      </Dialog>
    </div>
  );
}
