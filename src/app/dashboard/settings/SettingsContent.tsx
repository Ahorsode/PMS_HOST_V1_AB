'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, Settings as SettingsIcon, Bell, Shield, Plus, Loader2, Save, CheckCircle2, Monitor, Trash2, Egg, ShoppingCart, SlidersHorizontal, Coins, ChartColumn, Wheat } from 'lucide-react';
import { updateFarmInfo, createHouse } from '@/lib/actions/dashboard-actions';
import { updateFarmSettings, getFarmSettings, getSalesSettings, updateSalesSettings } from '@/lib/actions/preference-actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { MutationBoundary } from '@/components/ui/MutationFeedback';

const SHOW_USER_DESKTOP_LICENSES = process.env.NEXT_PUBLIC_SHOW_USER_DESKTOP_LICENSES !== 'false';

// Tabs whose fields come from farm/sales settings and need them loaded.
const PREFERENCE_TABS = ['farm', 'notifications', 'egg-logging', 'sales'];

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
    if (activeTabFromUrl === 'desktop-licenses') {
      if (SHOW_USER_DESKTOP_LICENSES) {
        router.push('/dashboard/settings/desktop-licenses');
      } else {
        router.replace('/dashboard/settings?tab=farm');
      }
      return;
    }
    setActiveTab(activeTabFromUrl);
  }, [activeTabFromUrl, router]);

  const [isUpdatingFarm, setIsUpdatingFarm] = useState(false);
  const [isAddingHouse, setIsAddingHouse] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Preference states
  const [eggReminderTime, setEggReminderTime] = useState('18:00');
  const [feedReminderTime, setFeedReminderTime] = useState('18:00');
  const [currency, setCurrency] = useState('GHS');
  const [growthTarget, setGrowthTarget] = useState<number | undefined>();
  const [defaultEggUnit, setDefaultEggUnit] = useState<'crate' | 'individual'>('crate');
  const [allowEggUnitChange, setAllowEggUnitChange] = useState(false);
  const [defaultEggSortMode, setDefaultEggSortMode] = useState<'sorted' | 'unsorted'>('unsorted');
  const [allowEggSortModeChange, setAllowEggSortModeChange] = useState(false);
  const [allowBatchOverride, setAllowBatchOverride] = useState(false);
  const [allowWorkerDiscounts, setAllowWorkerDiscounts] = useState(false);
  const [defaultDiscountType, setDefaultDiscountType] = useState<'flat' | 'percent' | 'item'>('item');
  const [reorderLevels, setReorderLevels] = useState<Record<string, number>>({});
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [growthStandards, setGrowthStandards] = useState<any[]>([]);
  const [savingReorderId, setSavingReorderId] = useState<string | null>(null);

  useEffect(() => {
    if (!prefsLoaded && PREFERENCE_TABS.includes(activeTab)) {
      loadPreferences();
    }
  }, [activeTab, prefsLoaded]);

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
        setDefaultEggUnit(settings.defaultEggUnit === 'individual' ? 'individual' : 'crate');
        setAllowEggUnitChange(settings.allowEggUnitChange ?? false);
        setDefaultEggSortMode(settings.defaultEggSortMode === 'sorted' ? 'sorted' : 'unsorted');
        setAllowEggSortModeChange(settings.allowEggSortModeChange ?? false);
      }

      const salesSettings = await getSalesSettings();
      if (salesSettings) {
        setAllowBatchOverride(salesSettings.allowBatchOverride ?? false);
        setAllowWorkerDiscounts(salesSettings.allowWorkerDiscounts ?? false);
        const discountType = salesSettings.defaultDiscountType;
        setDefaultDiscountType(
          discountType === 'flat' || discountType === 'percent' ? discountType : 'item',
        );
      }
      
      const { getGrowthStandards } = await import('@/lib/actions/preference-actions');
      const standards = await getGrowthStandards();
      setGrowthStandards(standards);
      setPrefsLoaded(true);
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

  const saveSection = async (section: string, label: string, save: () => Promise<unknown>) => {
    setSavingSection(section);
    setMessage(null);
    try {
      await save();
      setMessage({ type: 'success', text: `${label} saved!` });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save ${label.toLowerCase()}.` });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveFarmDefaults = () =>
    saveSection('farm-defaults', 'Farm defaults', () =>
      updateFarmSettings({ currency, growthTargetStandard: growthTarget }),
    );

  const handleSaveReminders = () =>
    saveSection('reminders', 'Reminder times', () =>
      updateFarmSettings({
        eggRecordReminderTime: eggReminderTime,
        feedRecordReminderTime: feedReminderTime,
      }),
    );

  const handleSaveEggLogging = () =>
    saveSection('egg-logging', 'Egg logging defaults', () =>
      updateFarmSettings({
        defaultEggUnit,
        allowEggUnitChange,
        defaultEggSortMode,
        allowEggSortModeChange,
      }),
    );

  const handleSaveSales = () =>
    saveSection('sales', 'Sales settings', () =>
      updateSalesSettings({
        allowBatchOverride,
        allowWorkerDiscounts,
        defaultDiscountType,
      }),
    );

  const handleSaveReorderLevel = async (itemId: string) => {
    if (savingReorderId === itemId) return;
    setSavingReorderId(itemId);
    try {
      const { updateReorderLevel } = await import('@/lib/actions/preference-actions');
      await updateReorderLevel(itemId, reorderLevels[itemId] ?? 500);
      setMessage({ type: 'success', text: 'Reorder level saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save reorder level.' });
    } finally {
      setSavingReorderId(null);
    }
  };

  const tabs = [
    { id: 'farm', label: 'Farm info', icon: Home },
    { id: 'notifications', label: 'Reminders', icon: Bell },
    { id: 'egg-logging', label: 'Egg logging', icon: Egg },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'preferences', label: 'Stock levels', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'trash', label: 'Data recovery', icon: Trash2, href: '/dashboard/settings/trash' },
    { id: 'desktop-licenses', label: 'Connected devices', icon: Monitor },
  ].filter((tab) => SHOW_USER_DESKTOP_LICENSES || tab.id !== 'desktop-licenses');

  const navigateToTab = (tab: (typeof tabs)[number]) => {
    if (tab.id === 'desktop-licenses') {
      if (SHOW_USER_DESKTOP_LICENSES) {
        router.push('/dashboard/settings/desktop-licenses');
      }
      return;
    }
    if ('href' in tab && tab.href) {
      router.push(tab.href);
      return;
    }
    setActiveTab(tab.id);
    router.push(`/dashboard/settings?tab=${tab.id}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div className="md:col-span-1 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigateToTab(tab)}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center transition-colors duration-300 ${
              activeTab === tab.id
                ? 'bg-fg/[0.04] text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] border border-fg/[0.08]'
                : 'text-fg/80 hover:bg-fg/5 hover:text-fg'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="md:col-span-3 space-y-5">
        {message && (
          <div className={`p-3 rounded-md text-sm font-medium border flex items-center gap-2 ${
            message.type === 'success' ? 'bg-fg/[0.04] border-fg/[0.08] text-emerald-400' : 'bg-fg/[0.04] border-fg/[0.08] text-neg'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {activeTab === 'farm' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Farm information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateFarm} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input 
                      label="Farm name"
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
                    label="Total capacity"
                    name="capacity"
                    type="number" 
                    min="0"
                    defaultValue={farm?.capacity}
                    required
                  />
                  <div className="pt-3">
                    <Button type="submit" isLoading={isUpdatingFarm}>
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-fg-2" />
                  Farm defaults
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoadingPrefs ? (
                  <div className="flex items-center gap-2 text-fg/70"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-4 rounded-md bg-fg/[0.06] border border-fg/[0.08] space-y-2">
                      <p className="flex items-center gap-2 text-sm font-medium text-fg-2"><Coins className="w-4 h-4" aria-hidden="true" /> Farm currency</p>
                      <p className="text-xs text-fg/70">Used for sales, orders, and financial reporting.</p>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="bg-fg/[0.04] border border-fg/10 text-fg rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:border-fg/[0.08] focus:ring-1 focus:ring-fg/10"
                      >
                        <option value="GHS">Ghanaian cedi (GHS)</option>
                        <option value="USD">US dollar (USD)</option>
                        <option value="NGN">Nigerian naira (NGN)</option>
                        <option value="KES">Kenyan shilling (KES)</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-md bg-fg/[0.04] border border-fg/[0.08] space-y-2">
                      <p className="flex items-center gap-2 text-sm font-medium text-fg"><ChartColumn className="w-4 h-4" aria-hidden="true" /> Default growth target</p>
                      <p className="text-xs text-fg/70">Benchmark flock performance against industry standards.</p>
                      <select
                        value={growthTarget || ''}
                        onChange={e => setGrowthTarget(e.target.value ? Number(e.target.value) : undefined)}
                        className="bg-fg/[0.04] border border-fg/10 text-fg rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-fg/10 w-full"
                      >
                        <option value="">Select a standard...</option>
                        {growthStandards.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.livestockType})</option>
                        ))}
                      </select>
                    </div>

                    <Button onClick={handleSaveFarmDefaults} isLoading={savingSection === 'farm-defaults'}>
                      <Save className="w-4 h-4 mr-2" /> Save defaults
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>House configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg/80 mb-5 font-medium">Manage your poultry houses and their sensor configurations.</p>
                <Button onClick={() => router.push('/dashboard/houses')} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add new house
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-fg-3" />
                Daily record reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-fg/80 leading-relaxed">
                Set the time by which daily records must be submitted. If no record is logged before this time, the system will trigger an alert.
              </p>
              {isLoadingPrefs ? (
                <div className="flex items-center gap-2 text-fg/70"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 rounded-md bg-fg/[0.06] border border-fg/[0.08] space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-fg-2"><Egg className="w-4 h-4" aria-hidden="true" /> Egg collection reminder</p>
                    <p className="text-xs text-fg/70">Alert if no egg record is logged by this time each day.</p>
                    <input
                      type="time"
                      value={eggReminderTime}
                      onChange={e => setEggReminderTime(e.target.value)}
                      className="bg-fg/[0.04] border border-fg/10 text-fg rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:border-fg/[0.08] focus:ring-1 focus:ring-fg/10"
                    />
                  </div>

                  <div className="p-4 rounded-md bg-fg/[0.04] border border-fg/[0.08] space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-fg"><Wheat className="w-4 h-4" aria-hidden="true" /> Feed log reminder</p>
                    <p className="text-xs text-fg/70">Alert if no feeding record is logged by this time each day.</p>
                    <input
                      type="time"
                      value={feedReminderTime}
                      onChange={e => setFeedReminderTime(e.target.value)}
                      className="bg-fg/[0.04] border border-fg/10 text-fg rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:border-orange-400/60 focus:ring-1 focus:ring-fg/10"
                    />
                  </div>

                  <Button onClick={handleSaveReminders} isLoading={savingSection === 'reminders'} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> Save reminder times
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'egg-logging' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Egg className="w-5 h-5 text-pos" />
                Egg logging defaults
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-fg/80 leading-relaxed">
                Default unit and sorting mode for worker egg production entries.
              </p>
              {isLoadingPrefs ? (
                <div className="flex items-center gap-2 text-fg/70"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-fg/60">Default unit</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['crate', 'individual'] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setDefaultEggUnit(unit)}
                          className={`py-2 rounded-md text-xs font-medium transition-colors ${
                            defaultEggUnit === unit
                              ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                              : 'bg-fg/10 text-fg/70 hover:bg-fg/10'
                          }`}
                        >
                          {unit === 'crate' ? 'Crate' : 'Individual'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowEggUnitChange}
                      onChange={(e) => setAllowEggUnitChange(e.target.checked)}
                      className="rounded border-fg/20 bg-fg/[0.04] text-pos focus:ring-fg/10"
                    />
                    <span className="text-xs font-medium text-fg/80">Let workers change the unit per entry</span>
                  </label>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-fg/60">Default sort mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['unsorted', 'sorted'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDefaultEggSortMode(mode)}
                          className={`py-2 rounded-md text-xs font-medium transition-colors ${
                            defaultEggSortMode === mode
                              ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                              : 'bg-fg/10 text-fg/70 hover:bg-fg/10'
                          }`}
                        >
                          {mode === 'sorted' ? 'Sorted' : 'Unsorted'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowEggSortModeChange}
                      onChange={(e) => setAllowEggSortModeChange(e.target.checked)}
                      className="rounded border-fg/20 bg-fg/[0.04] text-pos focus:ring-fg/10"
                    />
                    <span className="text-xs font-medium text-fg/80">Let workers change sort mode per entry</span>
                  </label>

                  <Button onClick={handleSaveEggLogging} isLoading={savingSection === 'egg-logging'} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> Save egg logging defaults
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'sales' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-fg-2" />
                Sales settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-fg/80 leading-relaxed">
                Control what workers can override during farm-gate sales.
              </p>
              {isLoadingPrefs ? (
                <div className="flex items-center gap-2 text-fg/70"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
              ) : (
                <div className="space-y-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowBatchOverride}
                      onChange={(e) => setAllowBatchOverride(e.target.checked)}
                      className="rounded border-fg/20 bg-fg/[0.04] text-fg-2 focus:ring-fg/10"
                    />
                    <span className="text-xs font-medium text-fg/80">Allow selecting a specific batch instead of FIFO</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowWorkerDiscounts}
                      onChange={(e) => setAllowWorkerDiscounts(e.target.checked)}
                      className="rounded border-fg/20 bg-fg/[0.04] text-fg-2 focus:ring-fg/10"
                    />
                    <span className="text-xs font-medium text-fg/80">Allow workers to apply discounts</span>
                  </label>
                  {allowWorkerDiscounts ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-fg/60">Worker discount type</p>
                      <select
                        value={defaultDiscountType}
                        onChange={(e) => setDefaultDiscountType(e.target.value as 'flat' | 'percent' | 'item')}
                        className="bg-fg/[0.04] border border-fg/10 text-fg rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:border-fg/[0.08] focus:ring-1 focus:ring-fg/10 w-full"
                      >
                        <option value="item">Give away items</option>
                        <option value="flat">Flat amount</option>
                        <option value="percent">Percent</option>
                      </select>
                    </div>
                  ) : null}

                  <Button onClick={handleSaveSales} isLoading={savingSection === 'sales'} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> Save sales settings
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
                <SettingsIcon className="w-5 h-5 text-fg-3" />
                Feed reorder levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-fg/80 leading-relaxed">
                Set the minimum stock threshold (in kg) for each feed item. When stock falls below this level, a low-stock alert will be triggered on your dashboard.
              </p>
              {inventory.length === 0 ? (
                <div className="text-center py-9 text-fg/70 text-sm">No feed inventory items found. add inventory first.</div>
              ) : (
                <div className="space-y-2">
                  {inventory.map(item => (
                    <MutationBoundary key={item.id} active={savingReorderId === item.id} label="Saving threshold...">
                    <div className="flex items-center gap-3 p-3 rounded-md bg-fg/10 border border-fg/10">
                      <div className="flex-1">
                        <p className="font-medium text-fg text-sm">{item.itemName}</p>
                        <p className="text-xs text-fg/70">Current stock: {item.stockLevel} {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={reorderLevels[item.id] ?? 500}
                            onChange={e => setReorderLevels(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            className="w-28 bg-fg/[0.04] border border-fg/10 text-fg rounded-md px-2 py-2 text-sm font-medium focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-fg/10 text-right"
                            min={0}
                            step={10}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-fg/70 pointer-events-none">kg</span>
                        </div>
                        <Button aria-label="Save reorder level"
                          onClick={() => handleSaveReorderLevel(item.id)}
                          size="sm"
                          variant="outline"
                          isLoading={savingReorderId === item.id}
                          loadingText="Saving"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    </MutationBoundary>
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
               <div className="p-5 rounded-lg bg-fg/[0.04] border border-fg/[0.08] text-center space-y-3">
                  <Shield className="w-12 h-12 text-fg-3 mx-auto" />
                  <p className="text-sm text-fg/80">Security settings and password management are now handled through your <span className="text-fg font-medium">Personal profile</span>.</p>
                  <Button onClick={() => router.push('/dashboard/profile')} className="rounded-md">Go to profile</Button>
               </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
