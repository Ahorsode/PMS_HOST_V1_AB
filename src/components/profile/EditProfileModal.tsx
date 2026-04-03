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
import { User, Fingerprint, Shield } from 'lucide-react';

const profileSchema = z.object({
  firstname: z.string().min(2, "First name is required"),
  middleName: z.string().optional().or(z.literal('')),
  surname: z.string().min(2, "Surname is required"),
  changePassword: z.boolean(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.changePassword) {
    return !!data.currentPassword && !!data.newPassword && data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords must match and all fields are required when changing password",
  path: ["confirmPassword"],
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...initialData,
      changePassword: false,
    },
  });

  const changePasswordActive = watch("changePassword");

  const onSubmit = async (data: ProfileValues) => {
    setIsSubmitting(true);
    try {
      // 1. Update Name
      const nameResult = await updateProfile({
        firstname: data.firstname,
        surname: data.surname,
        middleName: data.middleName || "",
      } as any);

      if (!nameResult.success) {
        alert("Profile Update Error: " + nameResult.error);
        setIsSubmitting(false);
        return;
      }

      // 2. Update Password if requested
      if (data.changePassword && data.currentPassword && data.newPassword) {
        const { updatePassword } = await import('@/lib/actions/dashboard-actions');
        const passResult = await updatePassword({
          current: data.currentPassword,
          new: data.newPassword
        });

        if (!passResult.success) {
          alert("Password Change Error: " + passResult.error);
          setIsSubmitting(false);
          return;
        }
      }

      onOpenChange(false);
      router.refresh();
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
      description="Update your legal name and account security settings."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="flex items-center gap-4 mb-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-tight">Identity Control</p>
            <p className="text-sm font-medium text-white/60">Changes will be reflected across all farm records.</p>
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

        {/* Password Change Toggle */}
        <div className="pt-4 border-t border-white/5">
           <div 
             onClick={() => setValue("changePassword", !changePasswordActive)}
             className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all group"
           >
              <div className="flex items-center gap-3">
                 <Shield className={`w-5 h-5 ${changePasswordActive ? 'text-amber-400' : 'text-white/40 group-hover:text-white/60'}`} />
                 <p className="text-sm font-black uppercase tracking-widest text-white/80">Change Password</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${changePasswordActive ? 'bg-amber-500/40' : 'bg-white/10'}`}>
                 <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${changePasswordActive ? 'right-1 bg-amber-400' : 'left-1 bg-white/40'}`} />
              </div>
           </div>

           {changePasswordActive && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                 <Input 
                   label="Current Password"
                   type="password"
                   {...register("currentPassword")}
                 />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="New Password"
                      type="password"
                      {...register("newPassword")}
                    />
                    <Input 
                      label="Confirm New Password"
                      type="password"
                      {...register("confirmPassword")}
                      error={errors.confirmPassword?.message}
                    />
                 </div>
              </div>
           )}
        </div>

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
