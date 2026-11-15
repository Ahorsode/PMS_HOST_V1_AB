'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, CountrySelect, Form, FormError } from '@/components/ui/form';
import { setFarmCountry } from '@/lib/actions/dashboard-actions';
import { currencyForCountry } from '@/lib/countries';

export function ChooseCountryForm({ farmName }: { farmName: string }) {
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (!country) {
      setError('Choose the country your farm is in.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await setFarmCountry(country);
    if (result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(result.error);
      setIsLoading(false);
    }
  };

  const currency = country ? currencyForCountry(country) : null;

  return (
    <AuthShell
      title="Where is your farm?"
      subtitle={
        <>
          Choose the country for <span className="font-semibold text-fg">{farmName}</span>. Your sales, expenses and
          reports are shown in its money.
        </>
      }
    >
      <Form onSubmit={handleSubmit} className="space-y-5">
        <FormError>{error}</FormError>

        <CountrySelect
          value={country}
          onChange={(code) => {
            setCountry(code);
            setError(null);
          }}
          required
          disabled={isLoading}
          hint={
            currency
              ? currency === 'GHS'
                ? 'Money is shown in Ghana cedis (GHS), and plans are priced in cedis.'
                : `Money is shown in ${currency}. Amounts already recorded keep their numbers; they are not converted. Plans are priced in US dollars.`
              : undefined
          }
        />

        <Button
          type="submit"
          variant="accent"
          isLoading={isLoading}
          loadingText="Saving"
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </Form>
    </AuthShell>
  );
}
