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

const OPTIONS: { value: PlanTypeValue; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'SOLO', label: 'Solo', icon: User, description: 'Owner only. Solo Basic GHS 200 or Solo Plus GHS 330 a month.' },
  { value: 'TEAM', label: 'Team', icon: Users, description: 'Owner and staff. Business GHS 350 or Business Plus GHS 470 a month.' },
];

/**
 * Lets the owner switch between Solo and Team. On a running paid plan the
 * switch is made by buying a plan of the other type, so it links there.
 */
export function PlanTypeCard({ planType, onPaidPlan }: { planType: PlanTypeValue; onPaidPlan: boolean }) {
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
      toast.success(next === 'SOLO' ? 'Switched to Solo' : 'Switched to Team');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-400" />
          Plan Type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.value === planType;
            const content = (
              <>
                <span className="flex items-center gap-2 text-base font-bold text-white">
                  <Icon className="h-5 w-5 text-emerald-300" />
                  {option.label}
                  {selected ? (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                      Current
                    </span>
                  ) : null}
                </span>
                <span className="text-xs leading-5 text-white/70">{option.description}</span>
              </>
            );
            const className = cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
              selected ? 'border-emerald-400 bg-emerald-500/15' : 'border-white/10 bg-white/5 hover:border-white/30',
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
        <p className="text-xs leading-5 text-white/60">
          {onPaidPlan
            ? 'You are on a paid plan. Choosing the other type takes you to the Plans page to buy a plan of that type.'
            : 'Switching changes which plans you see on the Plans page. Solo farms cannot have staff.'}
        </p>
      </CardContent>
    </Card>
  );
}
