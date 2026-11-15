'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, Mail, Lock } from 'lucide-react';
import { AuthDivider, AuthShell } from '@/components/auth/AuthShell';
import GoogleButton from '@/components/auth/GoogleButton';
import { Button, Checkbox, Form, FormError, FormRow, Input } from '@/components/ui/form';
import { MIN_PASSWORD_LENGTH } from '@/lib/password-policy';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstname: '',
    surname: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!formData.phoneNumber || !formData.password) return;
    if (!acceptTerms) {
      setError('Tick the box to accept the Terms of Service and Privacy Policy.');
      return;
    }

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // For sign up, we might need a custom action to create the user first 
      // or rely on the authorize function to handle auto-registration if it's designed that way.
      // Given the current auth.ts, it looks like it searches for invitations.
      // If we want a general sign up, we should probably have a server action.
      
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, acceptTerms }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // After successful registration, sign in
      const signinRes = await signIn('credentials', {
        identifier: formData.phoneNumber,
        password: formData.password,
        redirect: false,
      });
      
      if (signinRes?.error) {
        setError('Your account was made, but signing in failed. Go to Sign in and try again.');
        setIsLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    if (isLoading) return;
    setIsLoading(true);
    signIn('google', { callbackUrl: '/dashboard' });
  };

  if (success) {
    return (
      <AuthShell title="Your account is ready" subtitle="Opening your farm...">
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-accent" strokeWidth={1.75} />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Keep your flock, egg, feed and sales records in one place."
      footer={
        <>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sign in
          </button>
        </>
      }
    >
      <Form onSubmit={handleSubmit} className="space-y-5">
        <FormError>{error}</FormError>

        <FormRow alwaysInline>
          <Input
            label="First name"
            name="firstname"
            autoComplete="given-name"
            value={formData.firstname}
            onChange={handleChange}
            placeholder="e.g. Ama"
            disabled={isLoading}
          />
          <Input
            label="Surname"
            name="surname"
            autoComplete="family-name"
            value={formData.surname}
            onChange={handleChange}
            placeholder="e.g. Owusu"
            disabled={isLoading}
          />
        </FormRow>

        <Input
          label="Phone number"
          type="tel"
          inputMode="tel"
          name="phoneNumber"
          autoComplete="tel"
          leading={<Phone className="h-4 w-4" strokeWidth={1.75} />}
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="e.g. 054 000 0000"
          hint="You sign in with this number."
          required
          disabled={isLoading}
        />

        <Input
          label="Email"
          optional
          type="email"
          name="email"
          autoComplete="email"
          leading={<Mail className="h-4 w-4" strokeWidth={1.75} />}
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. ama@example.com"
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          leading={<Lock className="h-4 w-4" strokeWidth={1.75} />}
          value={formData.password}
          onChange={handleChange}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          required
          disabled={isLoading}
        />

        <Checkbox
          name="acceptTerms"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          required
          disabled={isLoading}
          label={
            <>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-accent underline underline-offset-2">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-accent underline underline-offset-2">Privacy Policy</Link>
              , and I am 18 or older.
            </>
          }
        />

        <Button
          type="submit"
          variant="accent"
          disabled={!formData.phoneNumber || !formData.password || !acceptTerms}
          isLoading={isLoading}
          loadingText="Creating account"
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          Create account
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </Form>

      <AuthDivider />

      <GoogleButton onClick={handleGoogleSignUp} label="Sign up with Google" disabled={isLoading} />
      <p className="mt-3 text-center text-[13px] leading-5 text-fg-3">
        With Google, you accept the Terms of Service and Privacy Policy before you start.
      </p>
    </AuthShell>
  );
}
