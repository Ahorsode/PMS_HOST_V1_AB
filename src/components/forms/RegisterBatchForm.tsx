"use client";

import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBatch } from '@/lib/actions/batch-actions';
import { useRouter } from 'next/navigation';
import {
  BreedSelect,
  Button,
  DateInput,
  Dialog,
  Form,
  FormActions,
  FormRow,
  FormSection,
  FormSteps,
  Input,
  MoreDetails,
  Select,
} from '@/components/ui/form';
import { getLivestockUnit } from '@/lib/utils/growth-utils';
import { getBreedOptionsForCategory, LIVESTOCK_CATEGORY_OPTIONS, normalizeBreedValue } from '@/lib/farm/livestock-breed-options';

import { FinancialInitializationModal } from '@/components/modals/FinancialInitializationModal';
import { LivestockType } from '@prisma/client';
import { createHouse } from '@/lib/actions/dashboard-actions';
import { toast } from 'sonner';

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

const REGISTER_STEPS = [
  { id: 'house', label: 'House' },
  { id: 'flock', label: 'Flock' },
];

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
  // Shows the two-step progress only to a farm that had to add its first house here.
  const [startedWithoutHouse] = React.useState(houses.length === 0);
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
      // Most flocks are added the day they arrive.
      hatchDate: new Date().toISOString().split('T')[0],
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
      toast.error("Enter the house name and how many it holds");
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
        toast.success("House added. Now add your flock.");
        setShowHouseModal(false);
        setNewHouseData({ name: '', capacity: '' });
        // Wait a tick so the new option exists before selecting it.
        setTimeout(() => setValue("houseId", created.id, { shouldValidate: true }), 0);
        router.refresh();
      } else {
        toast.error(res.error || "The house could not be added");
      }
    } catch (e) {
      toast.error("Something went wrong. Check your connection and try again.");
    } finally {
      setIsCreatingHouse(false);
    }
  };

  const houseFields = (
    <>
      <Input
        label="House name"
        placeholder="e.g. House A, Pen 1"
        value={newHouseData.name}
        onChange={e => setNewHouseData(p => ({ ...p, name: e.target.value }))}
        disabled={isCreatingHouse}
      />
      <Input
        label="How many it holds"
        type="number"
        min="1"
        unit="birds"
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
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          handleCreateHouse();
        }}
        noValidate
      >
        <FormSteps steps={REGISTER_STEPS} current={0} />
        <FormSection title="Add your first house" hint="Every flock lives in a house. Add one now, then add the flock.">
          {houseFields}
        </FormSection>
        <FormActions>
          <Button type="submit" variant="accent" isLoading={isCreatingHouse} loadingText="Saving house">
            Save house and continue
          </Button>
        </FormActions>
      </Form>
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
        toast.error(result.error || "The flock could not be added. Try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinModalClose = () => {
    setShowFinModal(false);
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <Form onSubmit={handleSubmit(onSubmit)} noValidate>
        {startedWithoutHouse ? <FormSteps steps={REGISTER_STEPS} current={1} /> : null}
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
          <FormSection title="Flock details">
            <Input
              label="Flock name"
              placeholder="e.g. Broilers March"
              required
              {...register("batchName")}
              error={errors.batchName?.message}
            />

            <FormRow>
              <Select
                label="Kind of livestock"
                options={[...LIVESTOCK_CATEGORY_OPTIONS]}
                {...register("type")}
                error={errors.type?.message}
              />
              <Controller
                name="breed"
                control={control}
                render={({ field }) => (
                  <BreedSelect
                    label="Breed"
                    options={breedOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.breed?.message}
                    required
                  />
                )}
              />
            </FormRow>

            <Select
              label="House"
              required
              options={[
                { label: "Select a house", value: "" },
                ...houseOptions,
                { label: "+ Add a new house", value: "NEW_HOUSE" }
              ]}
              {...register("houseId")}
              error={errors.houseId?.message}
            />
          </FormSection>

          <FormSection title="How many and when">
            <FormRow>
              <Input
                label="Number at arrival"
                type="number"
                min="1"
                unit={getLivestockUnit(selectedType)}
                placeholder="e.g. 1000"
                required
                {...register("initialQuantity", { valueAsNumber: true })}
                error={errors.initialQuantity?.message}
              />
              <DateInput
                label="Arrival date"
                required
                {...register("hatchDate")}
                error={errors.hatchDate?.message}
              />
            </FormRow>
          </FormSection>

          <MoreDetails label="First vaccination (optional)">
            <FormRow>
              <DateInput label="Vaccination date" {...register("vaccinationDate")} />
              <Input label="Vaccine name" placeholder="e.g. Gumboro" {...register("vaccineName")} />
            </FormRow>
          </MoreDetails>
        </fieldset>

        <FormActions>
          <Button type="submit" variant="accent" isLoading={isSubmitting} loadingText="Adding flock">
            Add flock and continue
          </Button>
        </FormActions>
      </Form>

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
        title="Add a house"
        description="A place on your farm where this flock will live."
      >
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleCreateHouse();
          }}
          noValidate
        >
          {houseFields}
          <FormActions>
            <Button type="button" variant="outline" onClick={() => setShowHouseModal(false)} disabled={isCreatingHouse}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={isCreatingHouse} loadingText="Saving house">
              Add house
            </Button>
          </FormActions>
        </Form>
      </Dialog>
    </>
  );
}
