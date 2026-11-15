'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Form, FormError, FormRow, Input } from '@/components/ui/form';
import { MIN_PASSWORD_LENGTH } from '@/lib/password-policy';

export default function ChangePasswordPage() {
  const [firstname, setFirstname] = useState('');
  const [surname, setSurname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('The two passwords are not the same.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname, surname, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setSuccess(true);

      // Force session update to clear mustChangePassword flag
      await update({
        mustChangePassword: false,
        name: `${firstname} ${surname}`.trim()
      });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell title="Password updated" subtitle="Opening your dashboard...">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle2 className="h-8 w-8 text-accent" strokeWidth={1.75} />
          <Loader2 className="h-5 w-5 animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set your password"
      subtitle="Add your name and choose a password only you know."
    >
      <Form onSubmit={handleSubmit} className="space-y-5">
        <FormError>{error}</FormError>

        <FormRow alwaysInline>
          <Input
            label="First name"
            autoComplete="given-name"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            placeholder="e.g. Kofi"
            required
            disabled={isLoading}
          />
          <Input
            label="Surname"
            autoComplete="family-name"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="e.g. Mensah"
            required
            disabled={isLoading}
          />
        </FormRow>

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          leading={<Lock className="h-4 w-4" strokeWidth={1.75} />}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          required
          disabled={isLoading}
        />

        <Input
          label="Type it again"
          type="password"
          autoComplete="new-password"
          leading={<Lock className="h-4 w-4" strokeWidth={1.75} />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword && newPassword && confirmPassword !== newPassword ? 'The two passwords are not the same.' : undefined}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="accent"
          disabled={!newPassword || !confirmPassword || !firstname || !surname}
          isLoading={isLoading}
          loadingText="Saving"
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          Save and continue
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </Form>
    </AuthShell>
  );
}
