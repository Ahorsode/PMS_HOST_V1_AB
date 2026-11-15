'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Checkbox, Form, FormError } from '@/components/ui/form';
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
    <AuthShell
      title="Our terms have changed"
      subtitle={`Read and accept the Terms of Service and Privacy Policy (updated ${LEGAL_UPDATED_LABEL}) to keep using your farm account.`}
    >
      <Form onSubmit={handleSubmit} className="space-y-5">
        <FormError>{error}</FormError>

        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
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
          isLoading={isLoading}
          loadingText="Saving"
          disabled={!accepted}
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => signOut({ callbackUrl: '/login' })}
          disabled={isLoading}
          className="min-h-12 w-full md:min-h-11"
        >
          I don&apos;t agree. Sign out
        </Button>
      </Form>
    </AuthShell>
  );
}
