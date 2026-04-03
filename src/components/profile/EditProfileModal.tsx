"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updateProfile } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';
import { User, Fingerprint } from 'lucide-react';

const profileSchema = z.object({
  firstname: z.string().min(2, "First name is required"),
  middleName: z.string().optional(),
  surname: z.string().min(2, "Surname is required"),
});

type ProfileValues = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    firstname: string;
    middleName?: string;
    surname: string;
  };
}

export function EditProfileModal({ isOpen, onOpenChange, initialData }: EditProfileModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: ProfileValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateProfile({
        firstname: data.firstname,
        surname: data.surname,
        middleName: data.middleName || "",
      } as any);

      if (result.success) {
        onOpenChange(false);
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

  return (
    <Dialog 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      title="Edit Personal Identity"
      description="Update your legal name as it appears on official farm records."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="flex items-center gap-4 mb-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-tight">Identity Control</p>
            <p className="text-sm font-medium text-white/60">Changes will be reflected across all farm documents.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="John"
            {...register("firstname")}
            error={errors.firstname?.message}
          />
          <Input
            label="Middle Name (Optional)"
            placeholder="Quincy"
            {...register("middleName")}
          />
        </div>

        <Input
          label="Surname / Last Name"
          placeholder="Doe"
          {...register("surname")}
          error={errors.surname?.message}
        />

        <div className="pt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-2xl border-white/10 text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-2xl h-12"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
