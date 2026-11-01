'use client';

import React, { useState } from 'react';
import { onboardFarmer } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowRight, User, Users } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const planTypes = [
  {
    value: 'SOLO' as const,
    label: 'Solo',
    icon: User,
    description: 'Just me. I run the farm records on my own.',
    price: 'From GHS 200 / month',
  },
  {
    value: 'TEAM' as const,
    label: 'Team',
    icon: Users,
    description: 'Me and my staff, such as farm hands, cashiers or an accountant.',
    price: 'From GHS 350 / month',
  },
];

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'SOLO' | 'TEAM' | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
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
      const result = await onboardFarmer({ name, location, capacity, planType });
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
    <div className="min-h-screen flex items-center justify-center p-3">
      <div className="max-w-md w-full space-y-11 relative z-10">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-white tracking-normal italic">Welcome to <span className="text-emerald-400">Poultry Ledger</span></h1>
          <p className="text-sm text-white/70 font-bold uppercase tracking-widest italic">
            Let's get your farm set up to start tracking your operations.
          </p>
        </div>

        <Card className="glass-morphism border-none shadow-2xl rounded-lg p-3">
          <CardHeader>
            <CardTitle className="text-2xl italic tracking-normal">Farm Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-7">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md font-bold backdrop-blur-md">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <Input 
                  label="Farm Name"
                  name="name"
                  required
                  placeholder="e.g. Green Valley Farm"
                  disabled={isLoading}
                />
                <Input 
                  label="Location"
                  name="location"
                  required
                  placeholder="e.g. Kumasi, Ghana"
                  disabled={isLoading}
                />
                <Input 
                  label="Total Capacity (Birds)"
                  name="capacity"
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  disabled={isLoading}
                />
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-bold text-white">Who will use Poultry Ledger?</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {planTypes.map((option) => {
                    const Icon = option.icon;
                    const selected = planType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPlanType(option.value)}
                        disabled={isLoading}
                        aria-pressed={selected}
                        className={cn(
                          'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
                          selected
                            ? 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/40'
                            : 'border-white/10 bg-white/5 hover:border-white/30',
                        )}
                      >
                        <span className="flex items-center gap-2 text-base font-bold text-white">
                          <Icon className="h-5 w-5 text-emerald-300" />
                          {option.label}
                        </span>
                        <span className="text-xs leading-5 text-white/70">{option.description}</span>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/90">{option.price}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-5 text-white/60">
                  Every feature is free for your first 30 days. You can switch between Solo and Team later in Settings.
                </p>
              </fieldset>

              <div className="pt-3">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Setting up farm..."
                  size="lg"
                  className="w-full"
                >
                  Start Managing Farm
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Decorative background effects for onboarding */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] -z-10 animate-pulse delay-700" />
    </div>
  );
}
