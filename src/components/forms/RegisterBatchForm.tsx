"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBatch } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

import { FinancialInitializationModal } from '@/components/modals/FinancialInitializationModal';
import { LivestockType } from '@prisma/client';
import { createHouse } from '@/lib/actions/dashboard-actions';
import { Dialog } from '@/components/ui/Dialog';
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

interface RegisterBatchFormProps {
  houses: Array<{
    id: number;
    name: string;
  }>;
  onSuccess?: () => void;
}

export function RegisterBatchForm({ houses, onSuccess }: RegisterBatchFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showFinModal, setShowFinModal] = React.useState(false);
  const [createdBatchId, setCreatedBatchId] = React.useState<string | null>(null);
  const [createdBatchName, setCreatedBatchName] = React.useState("");
  const [showHouseModal, setShowHouseModal] = React.useState(false);
  const [isCreatingHouse, setIsCreatingHouse] = React.useState(false);
  const [newHouseData, setNewHouseData] = React.useState({ name: '', capacity: '' });
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: LivestockType.POULTRY_BROILER,
      breed: "Broiler",
    },
  });

  const selectedType = watch("type");
  const selectedHouseId = watch("houseId");

  React.useEffect(() => {
    if (selectedHouseId === "NEW_HOUSE") {
      setShowHouseModal(true);
      setValue("houseId", ""); // Reset dropdown to placeholder
    }
  }, [selectedHouseId]);

  const handleCreateHouse = async () => {
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
      if (res.success) {
        toast.success("House created successfully");
        setShowHouseModal(false);
        setNewHouseData({ name: '', capacity: '' });
        router.refresh();
        // After refresh, the new house will be in the props
        // We'll let the user select it from the updated list
      } else {
        toast.error(res.error || "Failed to create house");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreatingHouse(false);
    }
  };

  if (houses.length === 0) {
    return (
      <div className="p-5 text-center space-y-3">
        <p className="text-gray-400">You don't have any active farm houses yet.</p>
        <p className="text-sm text-gray-500 italic">A farm house is required before you can register a new livestock unit.</p>
        <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Link href="/dashboard/houses">Add New House First</Link>
        </Button>
      </div>
    );
  }

  const houseOptions = houses.map(h => ({ label: h.name, value: h.id.toString() }));
  
  const speciesOptions = [
    { label: "Poultry (Meat)", value: LivestockType.POULTRY_BROILER },
    { label: "Poultry (Eggs)", value: LivestockType.POULTRY_LAYER },
    { label: "Cattle / Livestock", value: LivestockType.CATTLE },
    { label: "Sheep / Goat", value: LivestockType.SHEEP_GOAT },
    { label: "Pig / Swine", value: LivestockType.PIG },
    { label: "Other / Generic", value: LivestockType.OTHER },
  ];

  const breedOptions = selectedType === LivestockType.POULTRY_BROILER 
    ? [
        { label: "Ross 308 (Standard)", value: "Ross 308" },
        { label: "Cobb 500 (Efficient)", value: "Cobb 500" },
        { label: "Hubbard (Hardy)", value: "Hubbard" },
        { label: "Other Breed", value: "Other" }
      ]
    : selectedType === LivestockType.POULTRY_LAYER
    ? [
        { label: "Isa Brown (Standard)", value: "Isa Brown" },
        { label: "Leghorn (White Eggs)", value: "Leghorn" },
        { label: "Lohmann (High Yield)", value: "Lohmann" },
        { label: "Other Breed", value: "Other" }
      ]
    : [
        { label: "No Preference / Standard", value: "Standard" },
        { label: "Specific Breed / Variety", value: "Other" }
      ];

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createBatch({
        houseId: parseInt(data.houseId),
        breedType: data.breed,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Unit Name / Identity"
            placeholder="e.g., Q1-Broiler-Alpha"
            {...register("batchName")}
            error={errors.batchName?.message}
          />

          <Select
            label="Livestock Category"
            options={speciesOptions}
            {...register("type")}
            error={errors.type?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Primary Breed / Specie"
            options={breedOptions}
            {...register("breed")}
            error={errors.breed?.message}
          />

          <Input
            label="Initial Quantity"
            type="number"
            min="1"
            placeholder="1000"
            {...register("initialQuantity", { valueAsNumber: true })}
            error={errors.initialQuantity?.message}
          />
        </div>

          <Select
            label="Farm House"
            options={[
              { label: "Select House Location", value: "" }, 
              ...houseOptions,
              { label: "➕ Add New House", value: "NEW_HOUSE" }
            ]}
            {...register("houseId")}
            error={errors.houseId?.message}
          />

        <Input
          label="Arrival / Hatch Date"
          type="date"
          {...register("hatchDate")}
          error={errors.hatchDate?.message}
        />

        <div className="border-t border-white/10 pt-3 mt-2">
          <h3 className="text-sm font-medium text-amber-500 mb-3 italic uppercase tracking-widest text-xs">Optional Initial Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="1st Vaccination Date"
              type="date"
              {...register("vaccinationDate")}
            />
            <Input
              label="Vaccine Name"
              placeholder="e.g., Gumboro"
              {...register("vaccineName")}
            />
          </div>
        </div>

        <div className="pt-3">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#064e3b] font-bold h-14 rounded-lg uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            Register Unit & Continue
          </Button>
        </div>
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
        onOpenChange={setShowHouseModal}
        title="➕ Create New Farm House"
        description="Add a new housing unit to your farm to accommodate this livestock unit."
      >
        <div className="space-y-4 pt-3">
          <Input 
            label="House Name / Number"
            placeholder="e.g. House Alpha, Pen 1"
            value={newHouseData.name}
            onChange={e => setNewHouseData(p => ({ ...p, name: e.target.value }))}
          />
          <Input 
            label="Total Capacity (Birds/Heads)"
            type="number"
            min="1"
            placeholder="e.g. 500"
            value={newHouseData.capacity}
            onChange={e => setNewHouseData(p => ({ ...p, capacity: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
             <Button variant="secondary" onClick={() => setShowHouseModal(false)} className="flex-1">Cancel</Button>
             <Button 
               onClick={handleCreateHouse} 
               isLoading={isCreatingHouse}
               className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
             >
               Create House
             </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
