"use client";

import React from 'react';
import { Crown, Check, Shield, Zap, Sparkles, Building2, LayoutDashboard, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { upgradeFarmSubscription } from '@/lib/actions/subscription-actions';
import { useRouter } from 'next/navigation';

const tiers = [
  {
    name: 'Standard Pro',
    tier: 'STANDARD',
    price: '$49',
    period: '/month',
    description: 'Perfect for growing commercial farms looking for advanced automation.',
    features: [
      'Up to 10 Livestock Units',
      'Advanced Health Analytics',
      'Full Financial Controls',
      'Inventory Management',
      'Basic Team Management (3 Workers)',
      'Email & WhatsApp Notifications'
    ],
    color: 'from-emerald-500 to-teal-400',
    shadow: 'shadow-emerald-500/20'
  },
  {
    name: 'Enterprise Suite',
    tier: 'PREMIUM',
    price: '$199',
    period: '/month',
    description: 'The ultimate solution for large integrated operations and multiple locations.',
    features: [
      'Unlimited Livestock Units',
      'AI-Driven Predictive Analytics',
      'Custom Financial Reporting',
      'Multi-Farm Consolidation',
      'Unlimited Team Members',
      '24/7 Priority Concierge Support'
    ],
    color: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-500/20',
    popular: true
  }
];

export default function LicenseUpgradePage() {
  const [isUpgrading, setIsUpgrading] = React.useState<string | null>(null);
  const router = useRouter();

  const handleUpgrade = async (tier: any) => {
    setIsUpgrading(tier);
    try {
      const result = await upgradeFarmSubscription(tier);
      if (result.success) {
        alert(`Successfully upgraded to ${tier} Tier! (Dev Mode Bypass Active)`);
        router.push('/dashboard/profile');
        router.refresh();
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("An unexpected error occurred.");
    } finally {
      setIsUpgrading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 px-4 py-16 scroll-smooth">
      {/* Header Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Dev Mode Enabled
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
          Elevate Your <span className="text-emerald-400 text-shadow-glow">Agri-Empire</span>
        </h1>
        <p className="text-lg text-white/50 font-medium leading-relaxed">
          Unlock the full potential of your commercial operation with our premium management suites. 
          <span className="block italic text-amber-500 mt-2 font-bold uppercase tracking-widest text-xs">※ Automated upgrade bypass active for development</span>
        </p>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-8">
        {tiers.map((tier) => (
          <div key={tier.name} className="relative group h-full">
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-1.5 bg-amber-500 rounded-full text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/40">
                Most Popular
              </div>
            )}
            
            <div className="absolute -inset-1 bg-gradient-to-r opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 blur-xl rounded-[2.5rem] bg-emerald-500"></div>
            
            <Card className="relative h-full bg-[#0f1115]/60 backdrop-blur-3xl border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col p-8 transition-all duration-500 group-hover:translate-y-[-8px]">
              <CardContent className="p-0 flex flex-col h-full space-y-8">
                {/* Tier Icon & Title */}
                <div className="space-y-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tier.color} p-0.5 shadow-xl ${tier.shadow}`}>
                    <div className="w-full h-full rounded-[14px] bg-[#0f1115] flex items-center justify-center">
                      {tier.tier === 'PRO' ? <Shield className="w-8 h-8 text-emerald-400" /> : <Crown className="w-8 h-8 text-amber-400" />}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{tier.name}</h3>
                    <p className="text-sm text-white/40 font-medium">{tier.description}</p>
                  </div>
                </div>

                {/* Price Section */}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{tier.price}</span>
                  <span className="text-white/30 font-bold text-sm uppercase tracking-widest">{tier.period}</span>
                </div>

                {/* Features List */}
                <div className="flex-1 space-y-4">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">What&apos;s Included:</p>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-white/70 font-medium group-hover:text-white transition-colors">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleUpgrade(tier.tier)}
                  isLoading={isUpgrading === tier.tier}
                  disabled={isUpgrading !== null}
                  className={`w-full h-16 rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl ${
                    tier.tier === 'PRO' 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-[#064e3b] shadow-emerald-500/20' 
                    : 'bg-amber-500 hover:bg-amber-400 text-[#451a03] shadow-amber-500/20'
                  }`}
                >
                  {isUpgrading === tier.tier ? 'Processing...' : `Upgrade to ${tier.tier}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Trust Badges */}
      <div className="pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: 'Centralized Control' },
          { icon: LayoutDashboard, label: 'Real-time Monitoring' },
          { icon: Fingerprint, label: 'Bank-grade Security' },
          { icon: Zap, label: 'Instant Settlement' }
        ].map((badge) => (
          <div key={badge.label} className="flex flex-col items-center gap-2 text-center p-4">
            <badge.icon className="w-5 h-5 text-white/20" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-tight">{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
