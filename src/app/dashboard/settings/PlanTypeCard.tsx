'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { setFarmPlanType } from '@/lib/actions/subscription-actions';
import { cn } from '@/lib/utils';

type PlanTypeValue = 'SOLO' | 'TEAM';

const OPTIONS: { value: PlanTypeValue; label: string; icon: React.ElementType; audience: string }[] = [
  { value: 'SOLO', label: 'Solo', icon: User, audience: 'Owner only.' },
  { value: 'TEAM', label: 'Team', icon: Users, audience: 'Owner and staff.' },
];

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

  function choose(next: PlanTypeValue) {
    if (next === planType || isPending) return;
    startTransition(async () => {
      const result = await setFarmPlanType(next);
      if (!result.success) {
        toast.error(result.error || 'Could not change the plan type');
        return;
      }
      toast.success(next === 'SOLO' ? 'Switched to solo' : 'Switched to team');
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
                  <Icon className="h-5 w-5 text-fg-3" />
                  {option.label}
                  {selected ? (
                    <span className="rounded-full bg-fg/[0.04] px-2 py-0.5 text-xs font-medium text-fg">
                      Current
                    </span>
                  ) : null}
                </span>
                <span className="text-xs leading-5 text-fg/70">{option.audience} {priceSummaries[option.value]}.</span>
              </>
            );
            const className = cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
              selected ? 'border-fg/[0.12] bg-fg/[0.04]' : 'border-fg/10 bg-fg/5 hover:border-fg/30',
            );

            if (!selected && onPaidPlan) {
              return (
                <Link key={option.value} href={`/dashboard/license-upgrade?type=${option.value}`} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
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
    </Card>
  );
}
