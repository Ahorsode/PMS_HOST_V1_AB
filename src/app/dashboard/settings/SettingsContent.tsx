'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, Settings as SettingsIcon, Bell, Shield, Plus, Loader2, Save, CheckCircle2, Monitor, Trash2, Egg, ShoppingCart, SlidersHorizontal, Wheat } from 'lucide-react';
import { updateFarmInfo, createHouse, setFarmCountry } from '@/lib/actions/dashboard-actions';
import { countryName, currencyForCountry } from '@/lib/farm/countries';
import { updateFarmSettings, getFarmSettings, getSalesSettings, updateSalesSettings } from '@/lib/actions/preference-actions';
import {
  Button,
  CountrySelect,
  Form,
  FormActions,
  FormError,
  FormNote,
  FormRow,
  FormSection,
  Input,
  Segmented,
  Select,
  Switch,
} from '@/components/ui/form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MutationBoundary } from '@/components/ui/MutationFeedback';
import { ArrowLeft } from 'lucide-react';
import { SettingsHomePhone, PhoneSaveBar } from './SettingsPhone';

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
  isFarmOwner?: boolean;
  /** Compact plan row for the phone settings list. */
  phonePlan?: React.ReactNode;
}

const PHONE_TITLES: Record<string, string> = {
  farm: 'Farm info',
  notifications: 'Reminders',
  'egg-logging': 'Egg logging',
  sales: 'Sales',
  preferences: 'Stock levels',
  security: 'Security',
};

export function SettingsContent({ farm, inventory = [], isFarmOwner = false, phonePlan }: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Phones open on a list of sections; a ?tab= opens one section.
  const phoneHome = !searchParams.get('tab');
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
  const savedCountry: string = farm?.country ?? '';
  const [country, setCountry] = useState<string>(savedCountry);
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
  // Last saved values, so the phone Save stays dim (and says why) until something changes.
  const [farmDirty, setFarmDirty] = useState(false);
  const [saved, setSaved] = useState({
    eggReminderTime: '18:00',
    feedReminderTime: '18:00',
    growthTarget: undefined as number | undefined,
    defaultEggUnit: 'crate' as 'crate' | 'individual',
    allowEggUnitChange: false,
    defaultEggSortMode: 'unsorted' as 'sorted' | 'unsorted',
    allowEggSortModeChange: false,
    allowBatchOverride: false,
    allowWorkerDiscounts: false,
    defaultDiscountType: 'item' as 'flat' | 'percent' | 'item',
  });

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
        setGrowthTarget(settings.growthTargetStandard ?? undefined);
        setDefaultEggUnit(settings.defaultEggUnit === 'individual' ? 'individual' : 'crate');
        setAllowEggUnitChange(settings.allowEggUnitChange ?? false);
        setDefaultEggSortMode(settings.defaultEggSortMode === 'sorted' ? 'sorted' : 'unsorted');
        setAllowEggSortModeChange(settings.allowEggSortModeChange ?? false);
        setSaved((prev) => ({
          ...prev,
          eggReminderTime: settings.eggRecordReminderTime || '18:00',
          feedReminderTime: settings.feedRecordReminderTime || '18:00',
          growthTarget: settings.growthTargetStandard ?? undefined,
          defaultEggUnit: settings.defaultEggUnit === 'individual' ? 'individual' : 'crate',
          allowEggUnitChange: settings.allowEggUnitChange ?? false,
          defaultEggSortMode: settings.defaultEggSortMode === 'sorted' ? 'sorted' : 'unsorted',
          allowEggSortModeChange: settings.allowEggSortModeChange ?? false,
        }));
      }

      const salesSettings = await getSalesSettings();
      if (salesSettings) {
        setAllowBatchOverride(salesSettings.allowBatchOverride ?? false);
        setAllowWorkerDiscounts(salesSettings.allowWorkerDiscounts ?? false);
        const discountType = salesSettings.defaultDiscountType;
        setDefaultDiscountType(
          discountType === 'flat' || discountType === 'percent' ? discountType : 'item',
        );
        setSaved((prev) => ({
          ...prev,
          allowBatchOverride: salesSettings.allowBatchOverride ?? false,
          allowWorkerDiscounts: salesSettings.allowWorkerDiscounts ?? false,
          defaultDiscountType: discountType === 'flat' || discountType === 'percent' ? discountType : 'item',
        }));
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
        setFarmDirty(false);
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
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save ${label.toLowerCase()}.` });
      return false;
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveFarmDefaults = async () => {
    const ok = await saveSection('farm-defaults', 'Farm defaults', () =>
      updateFarmSettings({ growthTargetStandard: growthTarget }),
    );
    if (ok) setSaved((prev) => ({ ...prev, growthTarget }));
  };

  const handleSaveCountry = () =>
    saveSection('country', 'Country', async () => {
      const result = await setFarmCountry(country);
      if (!result.success) throw new Error(result.error);
      router.refresh();
    });

  const handleSaveReminders = async () => {
    const ok = await saveSection('reminders', 'Reminder times', () =>
      updateFarmSettings({
        eggRecordReminderTime: eggReminderTime,
        feedRecordReminderTime: feedReminderTime,
      }),
    );
    if (ok) setSaved((prev) => ({ ...prev, eggReminderTime, feedReminderTime }));
  };

  const handleSaveEggLogging = async () => {
    const ok = await saveSection('egg-logging', 'Egg logging defaults', () =>
      updateFarmSettings({
        defaultEggUnit,
        allowEggUnitChange,
        defaultEggSortMode,
        allowEggSortModeChange,
      }),
    );
    if (ok) setSaved((prev) => ({ ...prev, defaultEggUnit, allowEggUnitChange, defaultEggSortMode, allowEggSortModeChange }));
  };

  const handleSaveSales = async () => {
    const ok = await saveSection('sales', 'Sales settings', () =>
      updateSalesSettings({
        allowBatchOverride,
        allowWorkerDiscounts,
        defaultDiscountType,
      }),
    );
    if (ok) setSaved((prev) => ({ ...prev, allowBatchOverride, allowWorkerDiscounts, defaultDiscountType }));
  };

  const remindersDirty = eggReminderTime !== saved.eggReminderTime || feedReminderTime !== saved.feedReminderTime;
  const growthDirty = growthTarget !== saved.growthTarget;
  const eggDirty =
    defaultEggUnit !== saved.defaultEggUnit ||
    allowEggUnitChange !== saved.allowEggUnitChange ||
    defaultEggSortMode !== saved.defaultEggSortMode ||
    allowEggSortModeChange !== saved.allowEggSortModeChange;
  const salesDirty =
    allowBatchOverride !== saved.allowBatchOverride ||
    allowWorkerDiscounts !== saved.allowWorkerDiscounts ||
    defaultDiscountType !== saved.defaultDiscountType;

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

  const loadingLine = (
    <div className="flex items-center gap-2 text-sm text-fg-2">
      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> Loading...
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-4 max-md:gap-3">
      {phoneHome ? (
        <SettingsHomePhone
          farm={farm}
          plan={phonePlan}
          loading={isLoadingPrefs || !prefsLoaded}
          growthTargetName={growthStandards.find((s) => s.id === growthTarget)?.name ?? null}
          eggUnit={defaultEggUnit}
          eggSorted={defaultEggSortMode === 'sorted'}
          discountsOn={allowWorkerDiscounts}
          discountType={defaultDiscountType}
          eggReminderTime={eggReminderTime}
          feedReminderTime={feedReminderTime}
          inventory={inventory.map((item) => ({ ...item, reorderLevel: reorderLevels[item.id] ?? item.reorderLevel ?? 500 }))}
          showDevices={SHOW_USER_DESKTOP_LICENSES}
        />
      ) : (
        <Link
          href="/dashboard/settings"
          className="flex min-h-11 items-center gap-3 font-ql-sans md:hidden"
          aria-label="Back to all settings"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ql-line text-ql-text">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-ql-display text-[22px] font-semibold leading-tight text-ql-text">{PHONE_TITLES[activeTab] ?? 'Settings'}</span>
            <span className="block text-[13px] text-ql-muted">Settings</span>
          </span>
        </Link>
      )}
      <nav aria-label="Settings sections" className="md:col-span-1 max-md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateToTab(tab)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:w-full ${
                activeTab === tab.id
                  ? 'border-accent/50 bg-accent/10 font-semibold text-accent'
                  : 'border-transparent text-fg-2 hover:bg-fg/[0.05] hover:text-fg'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className={`space-y-5 md:col-span-3 max-md:space-y-3 ${phoneHome ? 'max-md:hidden' : 'max-md:pb-28'}`}>
        {message ? (
          message.type === 'success' ? (
            <FormNote tone="success">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                {message.text}
              </span>
            </FormNote>
          ) : (
            <FormError>{message.text}</FormError>
          )
        ) : null}

        {activeTab === 'farm' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Farm details</CardTitle>
              </CardHeader>
              <CardContent>
                <Form onSubmit={handleUpdateFarm} onChange={() => setFarmDirty(true)}>
                  <FormRow>
                    <Input label="Farm name" name="name" defaultValue={farm?.name} required />
                    <Input label="Town or city" name="location" defaultValue={farm?.location || ''} required />
                  </FormRow>
                  <Input
                    label="Birds the farm can hold"
                    name="capacity"
                    type="number"
                    min="0"
                    unit="birds"
                    defaultValue={farm?.capacity}
                    required
                  />
                  <div className="max-md:hidden">
                    <FormActions>
                      <Button type="submit" variant="accent" isLoading={isUpdatingFarm} loadingText="Saving">
                        Save farm details
                      </Button>
                    </FormActions>
                  </div>
                  <PhoneSaveBar type="submit" dirty={farmDirty} busy={isUpdatingFarm} />
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span id="farm-defaults" aria-hidden className="block scroll-mt-24" />
                  <SlidersHorizontal className="h-5 w-5 text-fg-2" strokeWidth={1.75} />
                  Farm defaults
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPrefs ? (
                  loadingLine
                ) : (
                  <div className="space-y-6">
                    <FormSection
                      title="Country and money"
                      hint="Sales, expenses, reports and invoices are shown in your country's money."
                    >
                      {isFarmOwner ? (
                        <>
                          <CountrySelect
                            id="farm-country"
                            label="Farm country"
                            value={country}
                            onChange={setCountry}
                            hint={
                              country && country !== savedCountry
                                ? `Money will be shown in ${currencyForCountry(country)}. Amounts already recorded keep their numbers; they are not converted.`
                                : 'Plans are priced in Ghana cedis in Ghana and in US dollars elsewhere.'
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveCountry}
                            isLoading={savingSection === 'country'}
                            loadingText="Saving"
                            disabled={!country || country === savedCountry}
                          >
                            Save country
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-fg">
                          {savedCountry ? `${countryName(savedCountry)} · ${currencyForCountry(savedCountry)}` : 'Not set'}
                        </p>
                      )}
                    </FormSection>

                    <FormSection title="Growth target" hint="The standard your flocks' growth is compared against.">
                      {!growthTarget ? (
                        <p className="md:hidden">
                          <span className="inline-flex h-6 items-center rounded-full bg-ql-amber/14 px-2.5 font-ql-sans text-[11px] font-semibold text-ql-amber">Not set</span>
                        </p>
                      ) : null}
                      <Select
                        label="Compare growth against"
                        value={growthTarget || ''}
                        onChange={e => setGrowthTarget(e.target.value ? Number(e.target.value) : undefined)}
                      >
                        <option value="">Choose a standard</option>
                        {growthStandards.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.livestockType})</option>
                        ))}
                      </Select>
                      <div className="max-md:hidden">
                        <FormActions>
                          <Button type="button" variant="accent" onClick={handleSaveFarmDefaults} isLoading={savingSection === 'farm-defaults'} loadingText="Saving">
                            Save growth target
                          </Button>
                        </FormActions>
                      </div>
                      {/* Phones: outlined, and dim until the choice changes (the sticky Save is the farm details one). */}
                      <div className="space-y-1 md:hidden">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveFarmDefaults}
                          isLoading={savingSection === 'farm-defaults'}
                          loadingText="Saving"
                          disabled={!growthDirty}
                          className="w-full"
                        >
                          Save growth target
                        </Button>
                        {!growthDirty ? (
                          <p className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
                            {growthTarget ? 'No changes yet' : 'Choose a standard first'}
                          </p>
                        ) : null}
                      </div>
                    </FormSection>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Houses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-fg-2">Add, rename or remove the houses your flocks live in.</p>
                <Button type="button" onClick={() => router.push('/dashboard/houses')} variant="outline">
                  <Plus className="h-4 w-4" strokeWidth={1.75} /> Manage houses
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-fg-3" strokeWidth={1.75} />
                Daily reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPrefs ? (
                loadingLine
              ) : (
                <div className="space-y-6">
                  <p className="text-sm leading-6 text-fg-2">
                    If nothing is recorded by these times, you get a reminder.
                  </p>
                  <FormRow>
                    <Input
                      label="Eggs collected by"
                      type="time"
                      leading={<Egg className="h-4 w-4" strokeWidth={1.75} />}
                      value={eggReminderTime}
                      onChange={e => setEggReminderTime(e.target.value)}
                    />
                    <Input
                      label="Feeding recorded by"
                      type="time"
                      leading={<Wheat className="h-4 w-4" strokeWidth={1.75} />}
                      value={feedReminderTime}
                      onChange={e => setFeedReminderTime(e.target.value)}
                    />
                  </FormRow>
                  <div className="max-md:hidden">
                    <FormActions>
                      <Button type="button" variant="accent" onClick={handleSaveReminders} isLoading={savingSection === 'reminders'} loadingText="Saving">
                        Save reminder times
                      </Button>
                    </FormActions>
                  </div>
                  <PhoneSaveBar onClick={handleSaveReminders} dirty={remindersDirty} busy={savingSection === 'reminders'} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'egg-logging' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Egg className="h-5 w-5 text-pos" strokeWidth={1.75} />
                Recording eggs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPrefs ? (
                loadingLine
              ) : (
                <div className="space-y-6">
                  <p className="text-sm leading-6 text-fg-2">How your team records eggs collected.</p>
                  <FormSection>
                    <Segmented
                      label="Count eggs in"
                      value={defaultEggUnit}
                      onChange={setDefaultEggUnit}
                      options={[
                        { value: 'crate', label: 'Crates' },
                        { value: 'individual', label: 'Single eggs' },
                      ]}
                    />
                    <Switch
                      checked={allowEggUnitChange}
                      onChange={setAllowEggUnitChange}
                      label="Let workers switch between crates and single eggs"
                    />
                  </FormSection>
                  <FormSection>
                    <Segmented
                      label="Eggs are usually"
                      value={defaultEggSortMode}
                      onChange={setDefaultEggSortMode}
                      options={[
                        { value: 'unsorted', label: 'Not sorted' },
                        { value: 'sorted', label: 'Sorted by size' },
                      ]}
                    />
                    <Switch
                      checked={allowEggSortModeChange}
                      onChange={setAllowEggSortModeChange}
                      label="Let workers choose sorted or not each time"
                    />
                  </FormSection>
                  <div className="max-md:hidden">
                    <FormActions>
                      <Button type="button" variant="accent" onClick={handleSaveEggLogging} isLoading={savingSection === 'egg-logging'} loadingText="Saving">
                        Save egg settings
                      </Button>
                    </FormActions>
                  </div>
                  <PhoneSaveBar onClick={handleSaveEggLogging} dirty={eggDirty} busy={savingSection === 'egg-logging'} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'sales' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-fg-2" strokeWidth={1.75} />
                Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPrefs ? (
                loadingLine
              ) : (
                <div className="space-y-6">
                  <p className="text-sm leading-6 text-fg-2">What workers may change when they record a sale.</p>
                  <div className="divide-y divide-fg/[0.06]">
                    <Switch
                      checked={allowBatchOverride}
                      onChange={setAllowBatchOverride}
                      label="Choose which flock the eggs come from"
                      hint="Otherwise the oldest eggs are sold first."
                      className="py-2"
                    />
                    <Switch
                      checked={allowWorkerDiscounts}
                      onChange={setAllowWorkerDiscounts}
                      label="Give discounts"
                      className="py-2"
                    />
                  </div>
                  {allowWorkerDiscounts ? (
                    <Segmented
                      label="Workers can discount by"
                      value={defaultDiscountType}
                      onChange={(value: 'flat' | 'percent' | 'item') => setDefaultDiscountType(value)}
                      options={[
                        { value: 'item', label: 'Free items' },
                        { value: 'flat', label: 'Amount' },
                        { value: 'percent', label: 'Percent' },
                      ]}
                    />
                  ) : null}
                  <div className="max-md:hidden">
                    <FormActions>
                      <Button type="button" variant="accent" onClick={handleSaveSales} isLoading={savingSection === 'sales'} loadingText="Saving">
                        Save sales settings
                      </Button>
                    </FormActions>
                  </div>
                  <PhoneSaveBar onClick={handleSaveSales} dirty={salesDirty} busy={savingSection === 'sales'} />
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
                <SettingsIcon className="h-5 w-5 text-fg-3" strokeWidth={1.75} />
                Low feed alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-fg-2">
                When a feed falls below this amount, you get a low-stock alert on your dashboard.
              </p>
              {inventory.length === 0 ? (
                <p className="rounded-xl border border-dashed border-fg/[0.14] py-8 text-center text-sm text-fg-2">
                  No feed in stock yet. Add feed under Inventory first.
                </p>
              ) : (
                <ul className="space-y-3">
                  {inventory.map(item => (
                    <li key={item.id}>
                      <MutationBoundary active={savingReorderId === item.id} label="Saving..." className="rounded-xl">
                        <div className="flex flex-col gap-3 rounded-xl border border-fg/[0.08] bg-tile p-4 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-fg">{item.itemName}</p>
                            <p className="text-[13px] text-fg-3">{item.stockLevel} {item.unit} in stock now</p>
                          </div>
                          <div className="flex items-end gap-3">
                            <Input
                              label="Alert below"
                              wrapperClassName="w-40"
                              type="number"
                              unit={item.unit || 'units'}
                              value={reorderLevels[item.id] ?? 500}
                              onChange={e => setReorderLevels(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                              min={0}
                              step={10}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleSaveReorderLevel(item.id)}
                              isLoading={savingReorderId === item.id}
                              loadingText="Saving"
                              className="min-h-12 md:min-h-11"
                              aria-label={`Save alert level for ${item.itemName}`}
                            >
                              <Save className="h-4 w-4" strokeWidth={1.75} />
                              Save
                            </Button>
                          </div>
                        </div>
                      </MutationBoundary>
                    </li>
                  ))}
                </ul>
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
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-fg-2">
                You change your password on your profile page.
              </p>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/profile')}>
                <Shield className="h-4 w-4" strokeWidth={1.75} />
                Go to my profile
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
