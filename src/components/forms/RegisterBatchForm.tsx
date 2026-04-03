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

const formSchema = z.object({
  batchName: z.string().min(2, "Unit Name is required"),
  breed: z.enum(["Broiler", "Layer"]),
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      breed: "Broiler",
    },
  });

  if (houses.length === 0) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-gray-400">You don't have any active farm houses yet.</p>
        <p className="text-sm text-gray-500 italic">A farm house is required before you can register a new livestock unit.</p>
        <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Link href="/dashboard/houses">Add New House First</Link>
        </Button>
      </div>
    );
  }

  const houseOptions = houses.map(h => ({ label: h.name, value: h.id.toString() }));
  const breedOptions = [
    { label: "Broiler (Meat Production)", value: "Broiler" },
    { label: "Layer (Egg Production)", value: "Layer" }
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Unit Name / Identity"
            placeholder="e.g., Q1-Broiler-Alpha"
            {...register("batchName")}
            error={errors.batchName?.message}
          />

          <Select
            label="Livestock Breed"
            options={breedOptions}
            {...register("breed")}
            error={errors.breed?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Initial Quantity"
            type="number"
            placeholder="1000"
            {...register("initialQuantity", { valueAsNumber: true })}
            error={errors.initialQuantity?.message}
          />

          <Select
            label="Farm House"
            options={[{ label: "Select House Location", value: "" }, ...houseOptions]}
            {...register("houseId")}
            error={errors.houseId?.message}
          />
        </div>

        <Input
          label="Arrival / Hatch Date"
          type="date"
          {...register("hatchDate")}
          error={errors.hatchDate?.message}
        />

        <div className="border-t border-white/10 pt-4 mt-2">
          <h3 className="text-sm font-medium text-amber-500 mb-4 italic uppercase tracking-widest text-[10px]">Optional Initial Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="pt-4">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#064e3b] font-black h-14 rounded-3xl uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
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
        />
      )}
    </div>
  );
}
