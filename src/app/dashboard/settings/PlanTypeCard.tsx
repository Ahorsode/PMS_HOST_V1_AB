'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Minus, User, Users } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { setFarmPlanType } from '@/lib/actions/subscription-actions';
import { cn } from '@/lib/utils';

type PlanTypeValue = 'SOLO' | 'TEAM';

const OPTIONS: { value: PlanTypeValue; label: string; icon: React.ElementType; audience: string }[] = [
  { value: 'SOLO', label: 'Solo', icon: User, audience: 'Owner only.' },
  { value: 'TEAM', label: 'Team', icon: Users, audience: 'Owner and staff.' },
];

/** What the owner gets and gives up by moving to each plan type. */
const SWITCH_EFFECTS: Record<PlanTypeValue, { gain: string[]; lose: string[] }> = {
  SOLO: {
    gain: ['A lower monthly price', 'One account to manage: just you'],
    lose: [
      'Staff can no longer sign in (their accounts are kept, not deleted)',
      'Inviting new staff',
      'Staff roles and permissions',
      'Team messages with your staff',
    ],
  },
  TEAM: {
    gain: [
      'Invite staff to log eggs, feed, sales and health',
      'Set roles and permissions for each person',
      'Team messages with your staff',
      'See who recorded each entry',
    ],
    lose: ['A higher monthly price'],
  },
};

/**
 * Lets the owner switch between Solo and Team. On a running paid plan the
 * switch is made by buying a plan of the other type, so it links there.
 */
export function PlanTypeCard({
  planType,
  onPaidPlan,
  priceSummaries,
}: {
  planType: PlanTypeValue;
  onPaidPlan: boolean;
  /** "Solo Basic GHS 200 or Solo Plus GHS 330 a month" per plan type, from the admin-set prices. */
  priceSummaries: Record<PlanTypeValue, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingChoice, setPendingChoice] = useState<PlanTypeValue | null>(null);

  function confirmSwitch() {
    const next = pendingChoice;
    if (!next) return;
    if (onPaidPlan) {
      // A running paid plan switches by buying a plan of the other type.
      setPendingChoice(null);
      router.push(`/dashboard/license-upgrade?type=${next}`);
      return;
    }
    choose(next);
  }

  function choose(next: PlanTypeValue) {
    if (next === planType || isPending) return;
    startTransition(async () => {
      const result = await setFarmPlanType(next);
      if (!result.success) {
        toast.error(result.error || 'Could not change the plan type');
        return;
      }
      toast.success(next === 'SOLO' ? 'Switched to solo' : 'Switched to team');
      setPendingChoice(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-fg-3" />
          Plan type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.value === planType;
            const content = (
              <>
                <span className="flex items-center gap-2 text-base font-medium text-fg">
                  <Icon className={cn('h-5 w-5', selected ? 'text-accent' : 'text-fg-3')} />
                  {option.label}
                  {selected ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
                      Current
                    </span>
                  ) : null}
                </span>
                <span className="text-xs leading-5 text-fg/70">{option.audience} {priceSummaries[option.value]}.</span>
              </>
            );
            const className = cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
              selected ? 'border-accent/50 bg-accent/10' : 'border-fg/10 bg-fg/5 hover:border-fg/30',
            );

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => !selected && setPendingChoice(option.value)}
                disabled={isPending || selected}
                aria-pressed={selected}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-fg/60">
          {onPaidPlan
            ? 'You are on a paid plan. Choosing the other type takes you to the Plans page to buy a plan of that type.'
            : 'Switching changes which plans you see on the Plans page. Solo farms cannot have staff.'}
        </p>
      </CardContent>

      <Dialog
        isOpen={pendingChoice !== null}
        onOpenChange={(open) => !open && !isPending && setPendingChoice(null)}
        title={pendingChoice === 'SOLO' ? 'Switch to Solo?' : 'Switch to Team?'}
        description={pendingChoice ? `${OPTIONS.find((o) => o.value === pendingChoice)?.audience} ${priceSummaries[pendingChoice]}.` : undefined}
      >
        {pendingChoice && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="mb-2 text-sm font-medium text-pos">You gain</p>
              <ul className="space-y-1.5">
                {SWITCH_EFFECTS[pendingChoice].gain.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-fg">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pos" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-neg">You lose</p>
              <ul className="space-y-1.5">
                {SWITCH_EFFECTS[pendingChoice].lose.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-fg">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-neg" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {onPaidPlan && (
              <p className="text-xs leading-5 text-fg/60">
                You are on a paid plan, so confirming takes you to the Plans page to buy a {pendingChoice === 'SOLO' ? 'Solo' : 'Team'} plan.
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPendingChoice(null)} disabled={isPending} className="flex-1">
                Keep {planType === 'SOLO' ? 'Solo' : 'Team'}
              </Button>
              <Button onClick={confirmSwitch} isLoading={isPending} loadingText="Switching..." className="flex-1">
                {onPaidPlan ? 'Continue to Plans' : `Switch to ${pendingChoice === 'SOLO' ? 'Solo' : 'Team'}`}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
