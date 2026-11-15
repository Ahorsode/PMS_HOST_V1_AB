'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, Settings as SettingsIcon, Bell, Shield, Plus, Loader2, Save, CheckCircle2, Monitor, Trash2, Egg, ShoppingCart, SlidersHorizontal, Wheat } from 'lucide-react';
import { updateFarmInfo, createHouse, setFarmCountry } from '@/lib/actions/dashboard-actions';
import { countryName, currencyForCountry } from '@/lib/countries';
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
  isFarmOwner?: boolean;
}

export function SettingsContent({ farm, inventory = [], isFarmOwner = false }: SettingsContentProps) {
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
      updateFarmSettings({ growthTargetStandard: growthTarget }),
    );

  const handleSaveCountry = () =>
    saveSection('country', 'Country', async () => {
      const result = await setFarmCountry(country);
      if (!result.success) throw new Error(result.error);
      router.refresh();
    });

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

  const loadingLine = (
    <div className="flex items-center gap-2 text-sm text-fg-2">
      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> Loading...
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
      <nav aria-label="Settings sections" className="md:col-span-1">
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

      <div className="space-y-5 md:col-span-3">
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
                <Form onSubmit={handleUpdateFarm}>
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
                  <FormActions>
                    <Button type="submit" variant="accent" isLoading={isUpdatingFarm} loadingText="Saving">
                      Save farm details
                    </Button>
                  </FormActions>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                      <FormActions>
                        <Button type="button" variant="accent" onClick={handleSaveFarmDefaults} isLoading={savingSection === 'farm-defaults'} loadingText="Saving">
                          Save growth target
                        </Button>
                      </FormActions>
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
                  <FormActions>
                    <Button type="button" variant="accent" onClick={handleSaveReminders} isLoading={savingSection === 'reminders'} loadingText="Saving">
                      Save reminder times
                    </Button>
                  </FormActions>
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
                  <FormActions>
                    <Button type="button" variant="accent" onClick={handleSaveEggLogging} isLoading={savingSection === 'egg-logging'} loadingText="Saving">
                      Save egg settings
                    </Button>
                  </FormActions>
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
                  <FormActions>
                    <Button type="button" variant="accent" onClick={handleSaveSales} isLoading={savingSection === 'sales'} loadingText="Saving">
                      Save sales settings
                    </Button>
                  </FormActions>
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
                              unit="kg"
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
