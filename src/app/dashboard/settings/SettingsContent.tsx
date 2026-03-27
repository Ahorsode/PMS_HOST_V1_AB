'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, Settings as SettingsIcon, Bell, Shield, Plus, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { updateFarmInfo, createHouse } from '@/lib/actions/dashboard-actions';
import { updateFarmSettings, getFarmSettings } from '@/lib/actions/preference-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

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
  const [activeTab, setActiveTab] = useState('farm');
  const [isUpdatingFarm, setIsUpdatingFarm] = useState(false);
  const [isAddingHouse, setIsAddingHouse] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  // Preference states
  const [eggReminderTime, setEggReminderTime] = useState('18:00');
  const [feedReminderTime, setFeedReminderTime] = useState('18:00');
  const [reorderLevels, setReorderLevels] = useState<Record<number, number>>({});
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);

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
      }
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

  const tabs = [
    { id: 'farm', label: 'Farm Info', icon: Home },
    { id: 'notifications', label: 'Reminders', icon: Bell },
    { id: 'preferences', label: 'Stock Levels', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">🌾 Feed Consumption Reminder</p>
                    <p className="text-xs text-white/50">Alert if no feed log is recorded by this time each day.</p>
                    <input
                      type="time"
                      value={feedReminderTime}
                      onChange={e => setFeedReminderTime(e.target.value)}
                      className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
                    />
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
