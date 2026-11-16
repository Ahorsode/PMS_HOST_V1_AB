"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormRow,
  FormSection,
  Input,
  Switch,
} from '@/components/ui/form';
import { updateProfile } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password-policy';

const profileSchema = z.object({
  firstname: z.string().min(2, "First name is required"),
  middleName: z.string().optional().or(z.literal('')),
  surname: z.string().min(2, "Surname is required"),
  changePassword: z.boolean(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`).optional().or(z.literal('')),
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
      title="Edit your profile"
      description="Your name shows on records you add and on invoices."
    >
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection title="Your name">
          <FormRow>
            <Input
              label="First name"
              placeholder="e.g. Ama"
              autoComplete="given-name"
              required
              {...register("firstname")}
              error={errors.firstname?.message}
            />
            <Input
              label="Middle name"
              optional
              placeholder="e.g. Esi"
              autoComplete="additional-name"
              {...register("middleName")}
            />
          </FormRow>
          <Input
            label="Surname"
            placeholder="e.g. Owusu"
            autoComplete="family-name"
            required
            {...register("surname")}
            error={errors.surname?.message}
          />
        </FormSection>

        <FormSection>
          <Switch
            checked={changePasswordActive}
            onChange={(checked) => setValue("changePassword", checked)}
            label="Change my password"
            hint="Leave this off to keep your current password."
          />

          {changePasswordActive && (
            <div className="space-y-4">
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              <FormRow>
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                  {...register("newPassword")}
                  error={errors.newPassword?.message}
                />
                <Input
                  label="Type it again"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  error={errors.confirmPassword?.message}
                />
              </FormRow>
            </div>
          )}
        </FormSection>

        <FormActions>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" isLoading={isSubmitting} loadingText="Saving">
            Save changes
          </Button>
        </FormActions>
      </Form>
    </Dialog>
  );
}
