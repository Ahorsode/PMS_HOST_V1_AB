'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Database, LayoutDashboard, Settings, Egg, Wheat, ThermometerSun, XCircle, Users, Banknote, RotateCcw, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormActions, FormNote, FormSection } from '@/components/ui/form/layout';
import type { StaffPermissions } from '@/lib/auth/staff-permission-defaults';

type PermissionState = Required<StaffPermissions>;

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  role: string;
  defaultPermissions: PermissionState;
  initialPermissions?: Partial<PermissionState>;
  onSave: (permissions: PermissionState) => Promise<void>;
  onResetToDefaults?: () => Promise<void>;
  isLoading: boolean;
}

function buildPermissionState(
  initialPermissions: Partial<PermissionState> | undefined,
  defaultPermissions: PermissionState
): PermissionState {
  return {
    canViewFinance: initialPermissions?.canViewFinance ?? defaultPermissions.canViewFinance,
    canEditFinance: initialPermissions?.canEditFinance ?? defaultPermissions.canEditFinance,
    canViewInventory: initialPermissions?.canViewInventory ?? defaultPermissions.canViewInventory,
    canEditInventory: initialPermissions?.canEditInventory ?? defaultPermissions.canEditInventory,
    canViewBatches: initialPermissions?.canViewBatches ?? defaultPermissions.canViewBatches,
    canEditBatches: initialPermissions?.canEditBatches ?? defaultPermissions.canEditBatches,
    canViewSales: initialPermissions?.canViewSales ?? defaultPermissions.canViewSales,
    canEditSales: initialPermissions?.canEditSales ?? defaultPermissions.canEditSales,
    canViewEggs: initialPermissions?.canViewEggs ?? defaultPermissions.canViewEggs,
    canEditEggs: initialPermissions?.canEditEggs ?? defaultPermissions.canEditEggs,
    canViewFeeding: initialPermissions?.canViewFeeding ?? defaultPermissions.canViewFeeding,
    canEditFeeding: initialPermissions?.canEditFeeding ?? defaultPermissions.canEditFeeding,
    canViewHouses: initialPermissions?.canViewHouses ?? defaultPermissions.canViewHouses,
    canEditHouses: initialPermissions?.canEditHouses ?? defaultPermissions.canEditHouses,
    canViewMortality: initialPermissions?.canViewMortality ?? defaultPermissions.canViewMortality,
    canEditMortality: initialPermissions?.canEditMortality ?? defaultPermissions.canEditMortality,
    canViewHealth: initialPermissions?.canViewHealth ?? defaultPermissions.canViewHealth,
    canEditHealth: initialPermissions?.canEditHealth ?? defaultPermissions.canEditHealth,
    canViewCustomers: initialPermissions?.canViewCustomers ?? defaultPermissions.canViewCustomers,
    canEditCustomers: initialPermissions?.canEditCustomers ?? defaultPermissions.canEditCustomers,
    canViewTeam: initialPermissions?.canViewTeam ?? defaultPermissions.canViewTeam,
    canEditTeam: initialPermissions?.canEditTeam ?? defaultPermissions.canEditTeam,
  };
}

export function PermissionsModal({
  isOpen,
  onClose,
  staffName,
  role,
  defaultPermissions,
  initialPermissions,
  onSave,
  onResetToDefaults,
  isLoading,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<PermissionState>(() =>
    buildPermissionState(initialPermissions, defaultPermissions)
  );

  useEffect(() => {
    if (isOpen) {
      setPermissions(buildPermissionState(initialPermissions, defaultPermissions));
    }
  }, [isOpen, initialPermissions, defaultPermissions]);

  const handleToggle = (key: keyof typeof permissions) => {
    setPermissions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // If turning off 'view', automatically turn off 'edit'
      if (key.startsWith('canView') && !next[key]) {
        const editKey = key.replace('canView', 'canEdit') as keyof typeof permissions;
        next[editKey] = false;
      }
      // If turning on 'edit', automatically turn on 'view'
      if (key.startsWith('canEdit') && next[key]) {
        const viewKey = key.replace('canEdit', 'canView') as keyof typeof permissions;
        next[viewKey] = true;
      }
      return next;
    });
  };

  const PermissionRow = ({ title, viewKey, editKey, icon: Icon, description }: { title: string, viewKey: keyof typeof permissions, editKey: keyof typeof permissions, icon: any, description?: string }) => (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-fg-3" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{title}</p>
          {description ? <p className="text-[13px] leading-5 text-fg-3">{description}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <ToggleSwitch label={`See ${title}`} short="See" checked={permissions[viewKey]} onChange={() => handleToggle(viewKey)} disabled={isLoading} />
        <ToggleSwitch label={`Change ${title}`} short="Change" checked={permissions[editKey]} onChange={() => handleToggle(editKey)} disabled={isLoading} />
      </div>
    </li>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isLoading && onClose()}
      title="What they can see and change"
      description={`${staffName} · ${role.toLowerCase().replace('_', ' ')}`}
      className="max-w-lg"
    >
      <div className="space-y-6">
        <FormSection title="Money and customers">
          <ul className="divide-y divide-fg/[0.06]">
            <PermissionRow title="Finance" viewKey="canViewFinance" editKey="canEditFinance" icon={Database} />
            <PermissionRow title="Sales" viewKey="canViewSales" editKey="canEditSales" icon={Banknote} />
            <PermissionRow title="Customers" viewKey="canViewCustomers" editKey="canEditCustomers" icon={Users} />
            <PermissionRow title="Inventory" viewKey="canViewInventory" editKey="canEditInventory" icon={LayoutDashboard} />
          </ul>
        </FormSection>

        <FormSection title="Farm work">
          <ul className="divide-y divide-fg/[0.06]">
            <PermissionRow title="Flocks" viewKey="canViewBatches" editKey="canEditBatches" icon={Settings} />
            <PermissionRow title="Houses" viewKey="canViewHouses" editKey="canEditHouses" icon={ThermometerSun} />
            <PermissionRow title="Eggs" viewKey="canViewEggs" editKey="canEditEggs" icon={Egg} />
            <PermissionRow title="Feeding" viewKey="canViewFeeding" editKey="canEditFeeding" icon={Wheat} />
            <PermissionRow title="Deaths and sick birds" viewKey="canViewMortality" editKey="canEditMortality" icon={XCircle} description="Recording, isolation and recovery" />
            <PermissionRow title="Vaccines and medicine" viewKey="canViewHealth" editKey="canEditHealth" icon={HeartPulse} />
          </ul>
        </FormSection>

        <FormSection title="Team">
          <ul className="divide-y divide-fg/[0.06]">
            <PermissionRow title="Team" viewKey="canViewTeam" editKey="canEditTeam" icon={Shield} />
          </ul>
        </FormSection>

        <FormNote>Owners can always see and change everything. Managers can too, unless you limit them here.</FormNote>

        <Button
          type="button"
          variant="ghost"
          onClick={() => (onResetToDefaults ? onResetToDefaults() : setPermissions(defaultPermissions))}
          disabled={isLoading}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          Back to the {role.toLowerCase().replace('_', ' ')} defaults
        </Button>

        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="accent" onClick={() => onSave(permissions)} isLoading={isLoading} loadingText="Saving">
            Save access
          </Button>
        </FormActions>
      </div>
    </Dialog>
  );
}

function ToggleSwitch({ checked, onChange, disabled, label, short }: { checked: boolean, onChange: () => void, disabled?: boolean, label: string, short: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
    >
      <span className="text-xs font-medium text-fg-2">{short}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-150 ${checked ? 'border-accent bg-accent' : 'border-fg/20 bg-fg/10'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full transition-transform duration-150 ${checked ? 'translate-x-6 bg-accent-fg' : 'translate-x-1 bg-fg-2'}`} />
      </span>
    </button>
  );
}
