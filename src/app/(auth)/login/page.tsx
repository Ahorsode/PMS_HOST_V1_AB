'use client';

import React, { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, Plus, Lock, ShieldAlert } from 'lucide-react';
import { LegalLinks } from '@/components/legal/LegalPage';
import { AuthDivider, AuthShell } from '@/components/auth/AuthShell';
import GoogleButton from '@/components/auth/GoogleButton';
import { Button, Form, FormError, FormNote, Input } from '@/components/ui/form';

const SECURITY_NOTICE = 'Your security permissions have been updated. Please sign in again to activate your new features.';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const authError = searchParams.get('error');
    if (authError === 'OAuthAccountNotLinked') {
      setError('This Google account could not be linked. Sign in with the email your administrator invited you with.');
    } else if (authError) {
      setError('Google sign-in failed. Please try again or contact your farm administrator.');
    }

    if (searchParams.get('security') !== 'updated') return;

    const storedMessage = window.sessionStorage.getItem('hatchlog_security_notice');
    setSecurityMessage(storedMessage || SECURITY_NOTICE);
    window.sessionStorage.removeItem('hatchlog_security_notice');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!phoneNumber || !password) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await signIn('credentials', {
        identifier: phoneNumber,
        password: password,
        redirect: false,
      });
      
        if (res?.error) {
          setError('That phone number and password do not match. Check them and try again.');
          setIsLoading(false);
        } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (isLoading) return;
    setIsLoading(true);
    signIn('google', { callbackUrl: '/dashboard' });
  };

  if (success) {
    return (
      <AuthShell title="You are signed in" subtitle="Opening your farm...">
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-accent" strokeWidth={1.75} />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Sign in to see your farm."
      footer={<LegalLinks className="justify-center text-[13px] text-fg-3" />}
    >
      <Form onSubmit={handleSubmit} className="space-y-5">
        {securityMessage ? (
          <FormNote tone="warning">
            <span className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yolk" strokeWidth={1.75} />
              <span>{securityMessage}</span>
            </span>
          </FormNote>
        ) : null}
        <FormError>{error}</FormError>

        <Input
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          leading={<Phone className="h-4 w-4" strokeWidth={1.75} />}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="e.g. 054 000 0000"
          disabled={isLoading}
          required
        />

        <Input
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          leading={<Lock className="h-4 w-4" strokeWidth={1.75} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="New team member? Use the one-time code your farm owner gave you."
          disabled={isLoading}
          required
        />

        <Button
          type="submit"
          variant="accent"
          disabled={!phoneNumber || !password}
          isLoading={isLoading}
          loadingText="Signing in"
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          Sign in
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </Form>

      <AuthDivider />

      <div className="space-y-3">
        <GoogleButton onClick={handleGoogleSignIn} label="Continue with Google" disabled={isLoading} />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/signup')}
          disabled={isLoading}
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Create a new account
        </Button>
      </div>
    </AuthShell>
  );
}
