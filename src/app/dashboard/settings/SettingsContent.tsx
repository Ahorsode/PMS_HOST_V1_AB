'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, Settings as SettingsIcon, Bell, Shield, Plus, Loader2, Save, CheckCircle2, Crown } from 'lucide-react';
import { updateFarmInfo, createHouse } from '@/lib/actions/dashboard-actions';
import { updateFarmSettings, getFarmSettings } from '@/lib/actions/preference-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';

interface InventoryItem {
  id: number;
  itemName: string;
  stockLevel: number;
  reorderLevel?: number;
  unit: string;
}

interface SettingsContentProps {
  farm: any;
  inventory?: InventoryItem[];
}

export function SettingsContent({ farm, inventory = [] }: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'farm');

  const [isUpdatingFarm, setIsUpdatingFarm] = useState(false);
  const [isAddingHouse, setIsAddingHouse] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Subscription Simulation states
  const [billingStep, setBillingStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('PRO');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Preference states
  const [eggReminderTime, setEggReminderTime] = useState('18:00');
  const [feedReminderTime, setFeedReminderTime] = useState('18:00');
  const [currency, setCurrency] = useState('GHS');
  const [growthTarget, setGrowthTarget] = useState<number | undefined>();
  const [reorderLevels, setReorderLevels] = useState<Record<number, number>>({});
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [growthStandards, setGrowthStandards] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'preferences' || activeTab === 'notifications') {
      loadPreferences();
    }
  }, [activeTab]);

  useEffect(() => {
    // Pre-populate reorder levels from current inventory data
    const initial: Record<number, number> = {};
    inventory.forEach(item => {
      initial[item.id] = item.reorderLevel ?? 500;
    });
    setReorderLevels(initial);
  }, [inventory]);

  const loadPreferences = async () => {
    setIsLoadingPrefs(true);
    try {
      const settings = await getFarmSettings();
      if (settings) {
        setEggReminderTime(settings.eggRecordReminderTime || '18:00');
        setFeedReminderTime(settings.feedRecordReminderTime || '18:00');
        setCurrency(settings.currency || 'GHS');
        setGrowthTarget(settings.growthTargetStandard ?? undefined);
      }
      
      const { getGrowthStandards } = await import('@/lib/actions/preference-actions');
      const standards = await getGrowthStandards();
      setGrowthStandards(standards);
    } catch (err) {
      console.error('Failed to load preferences', err);
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  const handleUpdateFarm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingFarm(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const capacity = parseInt(formData.get('capacity') as string);

    try {
      const result = await updateFarmInfo({ name, location, capacity });
      if (result.success) {
        setMessage({ type: 'success', text: 'Farm information updated successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update farm info.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsUpdatingFarm(false);
    }
  };

  const handleSaveReminders = async () => {
    setIsSavingPrefs(true);
    setMessage(null);
    try {
      await updateFarmSettings({
        eggRecordReminderTime: eggReminderTime,
        feedRecordReminderTime: feedReminderTime,
        currency,
        growthTargetStandard: growthTarget
      });
      setMessage({ type: 'success', text: 'Reminder times saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save reminder times.' });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSaveReorderLevel = async (itemId: number) => {
    try {
      const { updateReorderLevel } = await import('@/lib/actions/preference-actions');
      await updateReorderLevel(itemId, reorderLevels[itemId] ?? 500);
      setMessage({ type: 'success', text: 'Reorder level saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save reorder level.' });
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    await new Promise(r => setTimeout(r, 2000));
    setBillingStep(3);
    setIsUpgrading(false);
  };

  const tabs = [
    { id: 'farm', label: 'Farm Info', icon: Home },
    { id: 'notifications', label: 'Reminders', icon: Bell },
    { id: 'preferences', label: 'Stock Levels', icon: SettingsIcon },
    { id: 'billing', label: 'License & Billing', icon: Crown },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Confetti Animation Style */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti {
          position: fixed; top: -10px; width: 10px; height: 10px;
          animation: confetti-fall 3s linear infinite; z-index: 100;
        }
      `}</style>

      <div className="md:col-span-1 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-4 py-3 rounded-2xl flex items-center transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/30'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-6">
        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold backdrop-blur-md border flex items-center gap-2 ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {/* ---- FARM INFO TAB ---- */}
        {activeTab === 'farm' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Farm Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateFarm} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Farm Name"
                      name="name"
                      defaultValue={farm?.name}
                      required
                    />
                    <Input 
                      label="Location"
                      name="location"
                      defaultValue={farm?.location || ''}
                      required
                    />
                  </div>
                  <Input 
                    label="Total Capacity"
                    name="capacity"
                    type="number" 
                    defaultValue={farm?.capacity}
                    required
                  />
                  <div className="pt-4">
                    <Button type="submit" isLoading={isUpdatingFarm}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>House Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-6 font-medium">Manage your poultry houses and their sensor configurations.</p>
                <Button onClick={() => router.push('/dashboard/houses')} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add New House
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ---- REMINDERS TAB ---- */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Daily Record Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-white/60 leading-relaxed">
                Set the time by which daily records must be submitted. If no record is logged before this time, the system will trigger an alert.
              </p>
              {isLoadingPrefs ? (
                <div className="flex items-center gap-2 text-white/40"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
              ) : (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                    <p className="text-sm font-black text-blue-400 uppercase tracking-widest">🥚 Egg Collection Reminder</p>
                    <p className="text-xs text-white/50">Alert if no egg record is logged by this time each day.</p>
                    <input
                      type="time"
                      value={eggReminderTime}
                      onChange={e => setEggReminderTime(e.target.value)}
                      className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>

                  <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                    <p className="text-sm font-black text-purple-400 uppercase tracking-widest">💰 Farm Currency</p>
                    <p className="text-xs text-white/50">Used for sales, orders, and financial reporting.</p>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30"
                    >
                      <option value="GHS">Ghanaian Cedi (GHS)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="KES">Kenyan Shilling (KES)</option>
                    </select>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <p className="text-sm font-black text-amber-400 uppercase tracking-widest">📊 Default Growth Target</p>
                    <p className="text-xs text-white/50">Benchmark flock performance against industry standards.</p>
                    <select
                      value={growthTarget || ''}
                      onChange={e => setGrowthTarget(Number(e.target.value))}
                      className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 w-full"
                    >
                      <option value="">Select a Standard...</option>
                      {growthStandards.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.livestockType})</option>
                      ))}
                    </select>
                  </div>

                  <Button onClick={handleSaveReminders} isLoading={isSavingPrefs} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> Save Reminder Times
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ---- STOCK LEVELS TAB ---- */}
        {activeTab === 'preferences' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-amber-400" />
                Feed Reorder Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed">
                Set the minimum stock threshold (in kg) for each feed item. When stock falls below this level, a low-stock alert will be triggered on your dashboard.
              </p>
              {inventory.length === 0 ? (
                <div className="text-center py-10 text-white/30 italic text-sm">No feed inventory items found. Add inventory first.</div>
              ) : (
                <div className="space-y-3">
                  {inventory.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex-1">
                        <p className="font-black text-white text-sm">{item.itemName}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Current stock: {item.stockLevel} {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={reorderLevels[item.id] ?? 500}
                            onChange={e => setReorderLevels(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            className="w-28 bg-black/40 border border-white/10 text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 text-right"
                            min={0}
                            step={10}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 pointer-events-none">kg</span>
                        </div>
                        <Button
                          onClick={() => handleSaveReorderLevel(item.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ---- BILLING TAB ([SUBSCRIPTION SIMULATION]) ---- */}
        {activeTab === 'billing' && (
          <Card className="border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
             {billingStep === 3 && (
               <>
                 <div className="confetti bg-emerald-500" style={{left: '10%'}} />
                 <div className="confetti bg-amber-500" style={{left: '30%', animationDelay: '0.5s'}} />
                 <div className="confetti bg-blue-500" style={{left: '50%', animationDelay: '1.2s'}} />
                 <div className="confetti bg-pink-500" style={{left: '70%', animationDelay: '0.8s'}} />
                 <div className="confetti bg-emerald-500" style={{left: '90%', animationDelay: '1.5s'}} />
               </>
             )}
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                   <Crown className="w-5 h-5" /> Enterprise License Management
                </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="mb-8">
                   <div className="flex justify-between items-center mb-6">
                      {[1, 2, 3].map(step => (
                        <div key={step} className="flex items-center">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all ${
                              billingStep >= step ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/10 text-white/40'
                           }`}>
                              {step}
                           </div>
                           {step < 3 && <div className={`w-12 h-0.5 mx-2 ${billingStep > step ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                        </div>
                      ))}
                   </div>
                </div>

                {billingStep === 1 && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['STARTER', 'PRO', 'ENTERPRISE'].map(plan => (
                          <div 
                            key={plan}
                            onClick={() => setSelectedPlan(plan)}
                            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                              selectedPlan === plan ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-black/20 hover:border-white/20'
                            }`}
                          >
                             <div className="flex justify-between items-start mb-4">
                                <p className="font-black tracking-widest text-xs opacity-60">{plan}</p>
                                {selectedPlan === plan && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                             </div>
                             <p className="text-2xl font-black text-white">{plan === 'STARTER' ? '$45' : plan === 'PRO' ? '$120' : '$450'}<span className="text-xs font-medium text-white/40">/month</span></p>
                             <ul className="mt-4 space-y-2">
                                <li className="text-[10px] text-white/60 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Full Inventory Tracking</li>
                                <li className="text-[10px] text-white/60 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Financial Terminal Access</li>
                             </ul>
                          </div>
                        ))}
                     </div>
                     <Button onClick={() => setBillingStep(2)} className="w-full h-14 rounded-3xl bg-emerald-600 font-black uppercase tracking-widest">
                        Proceed to Payment
                     </Button>
                  </div>
                )}

                {billingStep === 2 && (
                  <div className="space-y-6 py-4">
                     <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                        <Input label="Card Number" placeholder="**** **** **** 4242" defaultValue="4242 4242 4242 4242" />
                        <div className="grid grid-cols-2 gap-4">
                           <Input label="Expiry" placeholder="MM/YY" defaultValue="12/26" />
                           <Input label="CVC" placeholder="***" defaultValue="123" />
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setBillingStep(1)} className="flex-1 h-12 rounded-2xl">Back</Button>
                        <Button 
                          onClick={handleUpgrade} 
                          isLoading={isUpgrading}
                          className="flex-3 h-12 rounded-2xl bg-emerald-600 font-black uppercase tracking-widest"
                        >
                          Confirm & Pay
                        </Button>
                     </div>
                  </div>
                )}

                {billingStep === 3 && (
                  <div className="text-center py-12 space-y-6">
                     <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                        <Crown className="w-10 h-10 text-black" />
                     </div>
                     <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white tracking-tighter">UPGRADE SUCCESSFUL!</h2>
                        <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Your Enterprise journey begins now</p>
                     </div>
                     <p className="text-white/60 text-sm max-w-xs mx-auto">Your billing cycle has been updated. You now have full access to all premium Agri-ERP features.</p>
                     <Button 
                        onClick={() => { setBillingStep(1); setActiveTab('farm'); }} 
                        className="w-full h-14 rounded-3xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200"
                     >
                        Return to Dashboard
                     </Button>
                  </div>
                )}
             </CardContent>
          </Card>
        )}

        {/* ---- SECURITY TAB ---- */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Security settings are coming soon.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
