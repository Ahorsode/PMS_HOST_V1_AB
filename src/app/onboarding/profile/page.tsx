'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Form, FormError, FormRow, Input } from '@/components/ui/form';
import { updateProfile } from '@/lib/actions/dashboard-actions';

export default function ProfileOnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstname = formData.get('firstname') as string;
    const surname = formData.get('surname') as string;

    try {
      const result = await updateProfile({ firstname, surname });
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Your name could not be saved. Try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="What should we call you?" subtitle="Your name appears on records you add and on invoices.">
      <Form onSubmit={handleSubmit} className="space-y-5">
        <FormError>{error}</FormError>

        <FormRow alwaysInline>
          <Input
            label="First name"
            name="firstname"
            autoComplete="given-name"
            required
            placeholder="e.g. Ama"
            disabled={isLoading}
          />
          <Input
            label="Surname"
            name="surname"
            autoComplete="family-name"
            required
            placeholder="e.g. Owusu"
            disabled={isLoading}
          />
        </FormRow>

        <Button
          type="submit"
          variant="accent"
          isLoading={isLoading}
          loadingText="Saving"
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          Continue to your farm
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </Form>
    </AuthShell>
  );
}
