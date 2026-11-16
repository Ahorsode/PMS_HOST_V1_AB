'use client';

import React, { useState } from 'react';
import { onboardFarmer } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';
import { ArrowRight, User, Users } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  Button,
  CountrySelect,
  Form,
  FormActions,
  FormError,
  FormRow,
  FormSection,
  Input,
  OptionCards,
} from '@/components/ui/form';
import { billingCurrencyForCountry, countryName, currencyForCountry } from '@/lib/farm/countries';

const planTypes = [
  {
    value: 'SOLO' as const,
    label: 'Solo',
    icon: User,
    description: 'Just me. I run the farm records on my own.',
  },
  {
    value: 'TEAM' as const,
    label: 'Team',
    icon: Users,
    description: 'Me and my staff, such as farm hands, cashiers or an accountant.',
  },
];

export default function OnboardingClient({
  priceLabels,
}: {
  /** "From GHS 200 / month" per plan type, in cedis (Ghana) and dollars (elsewhere). */
  priceLabels: Record<'GHS' | 'USD', Record<'SOLO' | 'TEAM', string>>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'SOLO' | 'TEAM' | null>(null);
  const [country, setCountry] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (!country) {
      setError('Choose the country your farm is in.');
      return;
    }
    if (!planType) {
      setError('Choose whether you will use Poultry Ledger alone or with a team.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const capacity = parseInt(formData.get('capacity') as string);

    try {
      const result = await onboardFarmer({ name, location, capacity, country, planType });
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to onboard. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      wide
      title="Set up your farm"
      subtitle="A few details and you can start recording. Every feature is free for your first 30 days."
    >
      <Form onSubmit={handleSubmit}>
        <FormError>{error}</FormError>

        <FormSection title="Your farm">
          <Input
            label="Farm name"
            name="name"
            required
            placeholder="e.g. Green Valley Farm"
            disabled={isLoading}
          />
          <CountrySelect
            value={country}
            onChange={(code) => {
              setCountry(code);
              setError(null);
            }}
            required
            disabled={isLoading}
            hint={
              country
                ? `Sales, expenses and reports will be shown in ${currencyForCountry(country)}.`
                : 'Sets the money your sales, expenses and reports are shown in.'
            }
          />
          <FormRow>
            <Input
              label="Town or city"
              name="location"
              required
              placeholder={country ? `e.g. a town in ${countryName(country)}` : 'e.g. Kumasi'}
              disabled={isLoading}
            />
            <Input
              label="Birds the farm can hold"
              name="capacity"
              type="number"
              required
              min="1"
              unit="birds"
              placeholder="e.g. 5000"
              disabled={isLoading}
            />
          </FormRow>
        </FormSection>

        <FormSection title="Who will use Poultry Ledger?" hint="You can switch between Solo and Team later in Settings.">
          <OptionCards
            aria-label="Who will use Poultry Ledger"
            value={planType}
            onChange={setPlanType}
            disabled={isLoading}
            options={planTypes.map((option) => {
              const Icon = option.icon;
              return {
                value: option.value,
                label: option.label,
                description: option.description,
                icon: <Icon className="h-5 w-5" strokeWidth={1.75} />,
                // Plans cost cedis in Ghana and dollars elsewhere, so the price waits for the country.
                aside: country ? priceLabels[billingCurrencyForCountry(country)][option.value] : undefined,
              };
            })}
          />
        </FormSection>

        <FormActions>
          <Button
            type="submit"
            variant="accent"
            isLoading={isLoading}
            loadingText="Setting up your farm"
          >
            Start using Poultry Ledger
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </FormActions>
      </Form>
    </AuthShell>
  );
}
