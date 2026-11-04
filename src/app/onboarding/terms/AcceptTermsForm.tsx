'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { acceptCurrentTerms } from '@/lib/actions/legal-actions';
import { LEGAL_UPDATED_LABEL } from '@/lib/legal';

export function AcceptTermsForm() {
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || !accepted) return;
    setIsLoading(true);
    setError(null);

    const result = await acceptCurrentTerms();
    if (result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(result.error || 'Could not save your acceptance. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <Card className="glass-morphism w-full max-w-md border-none shadow-2xl rounded-lg p-3">
        <CardHeader>
          <CardTitle className="text-2xl tracking-normal">Our terms</CardTitle>
          <p className="text-sm leading-6 text-white/75">
            Please read and accept our Terms of Service and Privacy Policy (updated {LEGAL_UPDATED_LABEL}) to keep using
            your farm account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md font-bold">
                {error}
              </div>
            )}

            <label className="flex items-start gap-3 text-sm leading-6 text-white/85">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={isLoading}
                className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="font-semibold text-emerald-400 underline underline-offset-2">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="font-semibold text-emerald-400 underline underline-offset-2">Privacy Policy</Link>
                , and I am 18 or older.
              </span>
            </label>

            <Button type="submit" isLoading={isLoading} loadingText="Saving..." size="lg" className="w-full" disabled={!accepted}>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              disabled={isLoading}
              className="w-full text-center text-sm font-semibold text-white/70 hover:text-white disabled:opacity-50"
            >
              Don&apos;t agree? Sign out
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
