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

const formSchema = z.object({
  batchName: z.string().min(2, "Batch name is required"),
  breed: z.enum(["Broiler", "Layer"]),
  initialQuantity: z.number().min(1, "Quantity must be at least 1"),
  hatchDate: z.string().min(1, "Hatch date is required"),
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
        <p className="text-sm text-gray-500 italic">A farm house is required before you can register a new batch.</p>
        <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Link href="/dashboard/houses">Add New House First</Link>
        </Button>
      </div>
    );
  }

  const houseOptions = houses.map(h => ({ label: h.name, value: h.id.toString() }));
  const breedOptions = [
    { label: "Broiler (Meat)", value: "Broiler" },
    { label: "Layer (Eggs)", value: "Layer" }
  ];

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createBatch({
        houseId: parseInt(data.houseId),
        breedType: data.breed,
        initialCount: data.initialQuantity,
        arrivalDate: data.hatchDate,
      });

      if (result.success) {
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Batch Name"
            placeholder="e.g., Spring-Broiler-01"
            {...register("batchName")}
            error={errors.batchName?.message}
          />

          <Select
            label="Breed"
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
            label="House"
            options={[{ label: "Select House", value: "" }, ...houseOptions]}
            {...register("houseId")}
            error={errors.houseId?.message}
          />
        </div>

        <Input
          label="Hatch Date"
          type="date"
          {...register("hatchDate")}
          error={errors.hatchDate?.message}
        />

        <div className="border-t border-white/10 pt-4 mt-2">
          <h3 className="text-sm font-medium text-amber-400 mb-4">Initial Schedule (Optional)</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="1st Vaccination Date"
              type="date"
              {...register("vaccinationDate")}
            />
            <Input
              label="Vaccine Name"
              placeholder="Newcastle/IBD"
              {...register("vaccineName")}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold h-12 hover:scale-[1.02] transition-transform"
          >
            Register Batch
          </Button>
        </div>
      </form>
    </div>
  );
}
