'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CountrySelect } from '@/components/ui/CountrySelect';
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
      setError('Select the country your farm is in.');
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
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <Card className="glass-morphism w-full max-w-md border-none shadow-2xl rounded-lg p-3">
        <CardHeader>
          <CardTitle className="text-2xl tracking-normal">Where is your farm?</CardTitle>
          <p className="text-sm leading-6 text-white/75">
            Choose the country for <span className="font-semibold text-white">{farmName}</span> once. Poultry Ledger shows your sales, expenses and reports in its currency.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md font-bold">
                {error}
              </div>
            )}

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
                    : `Money is shown in ${currency}. Amounts you already recorded keep their numbers; they are not converted. Plans are priced in US dollars.`
                  : undefined
              }
            />

            <Button type="submit" isLoading={isLoading} loadingText="Saving..." size="lg" className="w-full">
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
