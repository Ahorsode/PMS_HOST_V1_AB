'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, Settings as SettingsIcon, Bell, Shield, Plus, Loader2, Save, CheckCircle2, Laptop, Key, Copy, Check, CreditCard, ChevronRight } from 'lucide-react';
import { updateFarmInfo, createHouse } from '@/lib/actions/dashboard-actions';
import { updateFarmSettings, getFarmSettings } from '@/lib/actions/preference-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFarmLicenseStatus, purchaseDesktopLicense, generateDeviceLicenses } from '@/lib/actions/licenses';

interface InventoryItem {
  id: string;
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
  const activeTabFromUrl = searchParams.get('tab') || 'farm';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  useEffect(() => {
    if (activeTabFromUrl && activeTabFromUrl !== activeTab) {
      setActiveTab(activeTabFromUrl);
    }
  }, [activeTabFromUrl]);

  const [isUpdatingFarm, setIsUpdatingFarm] = useState(false);
  const [isAddingHouse, setIsAddingHouse] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Preference states
  const [eggReminderTime, setEggReminderTime] = useState('18:00');
  const [feedReminderTime, setFeedReminderTime] = useState('18:00');
  const [currency, setCurrency] = useState('GHS');
  const [growthTarget, setGrowthTarget] = useState<number | undefined>();
  const [reorderLevels, setReorderLevels] = useState<Record<string, number>>({});
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [growthStandards, setGrowthStandards] = useState<any[]>([]);

  // Desktop Licensing states
  const [licenseStatus, setLicenseStatus] = useState<string>('UNPAID');
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoadingLicense, setIsLoadingLicense] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [seatCount, setSeatCount] = useState<number>(3);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchLicenseData = async () => {
    setIsLoadingLicense(true);
    try {
      const res = await getFarmLicenseStatus();
      if (res.success) {
        setLicenseStatus(res.licenseStatus || 'UNPAID');
        setDevices(res.devices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLicense(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'licenses') {
      fetchLicenseData();
    }
  }, [activeTab]);

  const handleConfirmPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await purchaseDesktopLicense();
      if (res.success) {
        setLicenseStatus('PAID_AND_ACTIVE');
        setShowCheckoutModal(false);
        setMessage({ type: 'success', text: 'Desktop Bundle License unlocked successfully!' });
        await fetchLicenseData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Payment processing failed.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Payment failed' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGenerateKeys = async () => {
    setIsGeneratingKeys(true);
    try {
      const res = await generateDeviceLicenses(seatCount);
      if (res.success) {
        setMessage({ type: 'success', text: `Successfully generated ${seatCount} device license keys!` });
        await fetchLicenseData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to generate keys' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate keys' });
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const copyToClipboard = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (activeTab === 'preferences' || activeTab === 'notifications') {
      loadPreferences();
    }
  }, [activeTab]);

  useEffect(() => {
    const initial: Record<string, number> = {};
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

  const handleSaveReorderLevel = async (itemId: string) => {
    try {
      const { updateReorderLevel } = await import('@/lib/actions/preference-actions');
      await updateReorderLevel(itemId, reorderLevels[itemId] ?? 500);
      setMessage({ type: 'success', text: 'Reorder level saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save reorder level.' });
    }
  };

  const tabs = [
    { id: 'farm', label: 'Farm Info', icon: Home },
    { id: 'notifications', label: 'Reminders', icon: Bell },
    { id: 'preferences', label: 'Stock Levels', icon: SettingsIcon },
    { id: 'licenses', label: 'Desktop App Licenses', icon: Laptop },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div className="md:col-span-1 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/30'
                : 'text-white/80 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-5">
        {message && (
          <div className={`p-3 rounded-md text-sm font-bold backdrop-blur-md border flex items-center gap-2 ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {activeTab === 'farm' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Farm Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateFarm} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    min="0"
                    defaultValue={farm?.capacity}
                    required
                  />
                  <div className="pt-3">
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
                <p className="text-sm text-white/80 mb-5 font-medium">Manage your poultry houses and their sensor configurations.</p>
                <Button onClick={() => router.push('/dashboard/houses')} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add New House
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Daily Record Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-white/80 leading-relaxed">
                Set the time by which daily records must be submitted. If no record is logged before this time, the system will trigger an alert.
              </p>
              {isLoadingPrefs ? (
                <div className="flex items-center gap-2 text-white/70"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 rounded-md bg-blue-500/10 border border-blue-500/20 space-y-2">
                    <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">🥚 Egg Collection Reminder</p>
                    <p className="text-xs text-white/70">Alert if no egg record is logged by this time each day.</p>
                    <input
                      type="time"
                      value={eggReminderTime}
                      onChange={e => setEggReminderTime(e.target.value)}
                      className="bg-black/60 border border-white/10 text-white rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>

                  <div className="p-4 rounded-md bg-purple-500/10 border border-purple-500/20 space-y-2">
                    <p className="text-sm font-bold text-purple-400 uppercase tracking-widest">💰 Farm Currency</p>
                    <p className="text-xs text-white/70">Used for sales, orders, and financial reporting.</p>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="bg-black/60 border border-white/10 text-white rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30"
                    >
                      <option value="GHS">Ghanaian Cedi (GHS)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="KES">Kenyan Shilling (KES)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <p className="text-sm font-bold text-amber-400 uppercase tracking-widest">📊 Default Growth Target</p>
                    <p className="text-xs text-white/70">Benchmark flock performance against industry standards.</p>
                    <select
                      value={growthTarget || ''}
                      onChange={e => setGrowthTarget(Number(e.target.value))}
                      className="bg-black/60 border border-white/10 text-white rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 w-full"
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
            <CardContent className="space-y-3">
              <p className="text-sm text-white/80 leading-relaxed">
                Set the minimum stock threshold (in kg) for each feed item. When stock falls below this level, a low-stock alert will be triggered on your dashboard.
              </p>
              {inventory.length === 0 ? (
                <div className="text-center py-9 text-white/70 italic text-sm">No feed inventory items found. Add inventory first.</div>
              ) : (
                <div className="space-y-2">
                  {inventory.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-md bg-white/10 border border-white/10">
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{item.itemName}</p>
                        <p className="text-xs text-white/70 uppercase tracking-widest">Current stock: {item.stockLevel} {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={reorderLevels[item.id] ?? 500}
                            onChange={e => setReorderLevels(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            className="w-28 bg-black/60 border border-white/10 text-white rounded-md px-2 py-2 text-sm font-bold focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 text-right"
                            min={0}
                            step={10}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/70 pointer-events-none">kg</span>
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

        {/* ---- DESKTOP LICENSES TAB ---- */}
        {activeTab === 'licenses' && (
          <div className="space-y-6">
            {isLoadingLicense ? (
              <Card className="border border-white/5 bg-zinc-950/40">
                <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                  <p className="text-sm text-zinc-400">Loading licensing configurations...</p>
                </CardContent>
              </Card>
            ) : licenseStatus !== 'PAID_AND_ACTIVE' ? (
              /* State 1: Pitch Card */
              <Card className="border border-emerald-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20 shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500" />
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2 w-fit">
                    <Laptop className="w-3.5 h-3.5" />
                    Premium Offline Capability
                  </div>
                  <CardTitle className="text-2xl font-bold text-white tracking-tight">
                    Run Poultry PMS Offline on Your Farm
                  </CardTitle>
                  <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                    Deploy native Windows desktop apps across your farm infrastructure. Collect feeding stats, egg production, and mortality logs 100% offline. Automatically sync back to the cloud when a connection is detected.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'Zero Latency', desc: 'Instant local database read/write speeds, even during complete cloud outages.' },
                      { title: 'Auto Reconciliation', desc: 'Secure, transactional outbox queues background synchronization heartbeats.' },
                      { title: 'Optimized Display', desc: 'High-contrast theme optimized specifically for rugged outdoor farm conditions.' }
                    ].map((feat, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all duration-300">
                        <h4 className="font-semibold text-white text-sm mb-1">{feat.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-left">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">One-time Bundle License</p>
                      <p className="text-2xl font-extrabold text-white mt-0.5">$199 <span className="text-sm font-normal text-zinc-400">USD</span></p>
                    </div>
                    <Button 
                      onClick={() => setShowCheckoutModal(true)} 
                      className="px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold rounded-md shadow-lg shadow-emerald-500/10 flex items-center gap-2 group/btn transition-all duration-300 hover:scale-[1.02]"
                    >
                      <CreditCard className="w-4 h-4" />
                      Unlock Desktop License Bundle
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : devices.length === 0 ? (
              /* State 3: Seat count setup wizard */
              <Card className="border border-emerald-500/20 bg-zinc-950/40">
                <CardHeader>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2 w-fit">
                    Step 2: Seat Configuration
                  </div>
                  <CardTitle className="text-xl font-bold text-white">Configure Your Physical Terminals</CardTitle>
                  <p className="text-sm text-zinc-400 mt-1">
                    Determine how many physical computers or terminal screens you will deploy across your farm. We will generate a unique cryptographic license key for each seat.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2 max-w-md">
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Number of Terminal Seats</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={seatCount}
                        onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-white/5 border-white/10 text-white rounded-md focus:border-emerald-500/50"
                      />
                      <Button
                        disabled={isGeneratingKeys}
                        onClick={handleGenerateKeys}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 rounded-md flex items-center gap-2 whitespace-nowrap"
                      >
                        {isGeneratingKeys ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4" />
                            Complete Setup & Generate Keys
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">You can pre-allocate between 1 and 100 license slots now. Additional slots can be added later.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* State 4: Licenses Access Portal Table */
              <Card className="border border-white/5 bg-zinc-950/40">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Laptop className="w-5 h-5 text-emerald-400" />
                      Active Terminal Licenses
                    </CardTitle>
                    <p className="text-xs text-zinc-400 mt-1">Use these keys to register and activate your native Windows PMS desktop clients.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDevices([]); // clear to force setup page again
                      }}
                      className="border-white/10 hover:bg-white/5 text-xs h-8 rounded-md flex items-center gap-1.5 text-zinc-300 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Seat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          <th className="py-3.5 px-6">Device Label</th>
                          <th className="py-3.5 px-6">License Key</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6">Hardware Binding</th>
                          <th className="py-3.5 px-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {devices.map((device) => (
                          <tr key={device.id} className="hover:bg-white/[0.01] transition-colors text-sm text-zinc-300">
                            <td className="py-4 px-6 font-medium text-white">{device.deviceName}</td>
                            <td className="py-4 px-6">
                              <code className="px-2.5 py-1 rounded bg-white/5 border border-white/5 font-mono text-xs text-emerald-300 tracking-wider">
                                {device.licenseKey}
                              </code>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                device.status === 'ACTIVE' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                {device.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {device.hardwareId ? (
                                <code className="font-mono text-xs text-zinc-500">{device.hardwareId}</code>
                              ) : (
                                <span className="text-xs text-zinc-600 italic">Awaiting client activation</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                variant="ghost"
                                onClick={() => copyToClipboard(device.licenseKey)}
                                className="h-8 w-8 p-0 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white"
                                title="Copy License Key"
                              >
                                {copiedKey === device.licenseKey ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* State 2: Dummy Stripe Checkout Modal */}
            {showCheckoutModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-5">
                    {/* Left details panel */}
                    <div className="md:col-span-2 bg-zinc-900 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <Laptop className="w-4 h-4" />
                          Poultry PMS
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg">Desktop Bundle</h3>
                          <p className="text-xs text-zinc-400 mt-1">One-time purchase for full offline access</p>
                        </div>
                      </div>
                      <div className="mt-8 md:mt-0">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Amount</span>
                        <div className="text-2xl font-black text-white mt-1">$199.00</div>
                      </div>
                    </div>

                    {/* Right checkout details panel */}
                    <div className="md:col-span-3 p-6 space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <span className="text-sm font-semibold text-white">Stripe Testmode</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-semibold">Test Data</span>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Card Number</label>
                          <Input
                            disabled
                            value="4242 •••• •••• 4242"
                            className="bg-white/5 border-white/5 text-zinc-400 rounded-md"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Expires</label>
                            <Input
                              disabled
                              value="12 / 29"
                              className="bg-white/5 border-white/5 text-zinc-400 rounded-md"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">CVC</label>
                            <Input
                              disabled
                              value="123"
                              className="bg-white/5 border-white/5 text-zinc-400 rounded-md"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900 border border-white/5 rounded-md text-xs text-zinc-400 leading-relaxed">
                        ⚠️ This payment sandbox will bypass actual transaction networks and instantly activate your licenses.
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowCheckoutModal(false)}
                          className="flex-1 border-white/10 hover:bg-white/5 rounded-md h-11 text-zinc-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={isProcessingPayment}
                          onClick={handleConfirmPayment}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-md h-11 flex items-center justify-center gap-2"
                        >
                          {isProcessingPayment ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Pay $199
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- SECURITY TAB ---- */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="p-5 rounded-lg bg-emerald-500/10 border border-emerald-500/10 text-center space-y-3">
                  <Shield className="w-12 h-12 text-emerald-400 mx-auto" />
                  <p className="text-sm text-white/80">Security settings and password management are now handled through your <span className="text-emerald-400 font-bold">Personal Profile</span>.</p>
                  <Button onClick={() => router.push('/dashboard/profile')} className="rounded-md">Go to Profile</Button>
               </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
