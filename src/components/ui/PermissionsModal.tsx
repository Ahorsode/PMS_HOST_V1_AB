'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ShieldCheck, Database, LayoutDashboard, Settings, Egg, Wheat, ThermometerSun, XCircle, Users, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  initialPermissions?: {
    canViewFinance: boolean;
    canEditFinance: boolean;
    canViewInventory: boolean;
    canEditInventory: boolean;
    canViewBatches: boolean;
    canEditBatches: boolean;
    canViewSales: boolean;
    canEditSales: boolean;
    canViewEggs: boolean;
    canEditEggs: boolean;
    canViewFeeding: boolean;
    canEditFeeding: boolean;
    canViewHouses: boolean;
    canEditHouses: boolean;
    canViewMortality: boolean;
    canEditMortality: boolean;
    canViewCustomers: boolean;
    canEditCustomers: boolean;
    canViewTeam: boolean;
    canEditTeam: boolean;
  };
  onSave: (permissions: any) => Promise<void>;
  isLoading: boolean;
}

export function PermissionsModal({ isOpen, onClose, staffName, initialPermissions, onSave, isLoading }: PermissionsModalProps) {
  const defaults = {
    canViewFinance: false,
    canEditFinance: false,
    canViewInventory: false,
    canEditInventory: false,
    canViewBatches: true,
    canEditBatches: false,
    canViewSales: false,
    canEditSales: false,
    canViewEggs: true,
    canEditEggs: true,
    canViewFeeding: true,
    canEditFeeding: true,
    canViewHouses: true,
    canEditHouses: false,
    canViewMortality: true,
    canEditMortality: true,
    canViewCustomers: false,
    canEditCustomers: false,
    canViewTeam: false,
    canEditTeam: false,
  };

  const [permissions, setPermissions] = useState({
    canViewFinance: initialPermissions?.canViewFinance ?? defaults.canViewFinance,
    canEditFinance: initialPermissions?.canEditFinance ?? defaults.canEditFinance,
    canViewInventory: initialPermissions?.canViewInventory ?? defaults.canViewInventory,
    canEditInventory: initialPermissions?.canEditInventory ?? defaults.canEditInventory,
    canViewBatches: initialPermissions?.canViewBatches ?? defaults.canViewBatches,
    canEditBatches: initialPermissions?.canEditBatches ?? defaults.canEditBatches,
    canViewSales: initialPermissions?.canViewSales ?? defaults.canViewSales,
    canEditSales: initialPermissions?.canEditSales ?? defaults.canEditSales,
    canViewEggs: initialPermissions?.canViewEggs ?? defaults.canViewEggs,
    canEditEggs: initialPermissions?.canEditEggs ?? defaults.canEditEggs,
    canViewFeeding: initialPermissions?.canViewFeeding ?? defaults.canViewFeeding,
    canEditFeeding: initialPermissions?.canEditFeeding ?? defaults.canEditFeeding,
    canViewHouses: initialPermissions?.canViewHouses ?? defaults.canViewHouses,
    canEditHouses: initialPermissions?.canEditHouses ?? defaults.canEditHouses,
    canViewMortality: initialPermissions?.canViewMortality ?? defaults.canViewMortality,
    canEditMortality: initialPermissions?.canEditMortality ?? defaults.canEditMortality,
    canViewCustomers: initialPermissions?.canViewCustomers ?? defaults.canViewCustomers,
    canEditCustomers: initialPermissions?.canEditCustomers ?? defaults.canEditCustomers,
    canViewTeam: initialPermissions?.canViewTeam ?? defaults.canViewTeam,
    canEditTeam: initialPermissions?.canEditTeam ?? defaults.canEditTeam,
  });


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

  const PermissionRow = ({ title, viewKey, editKey, icon: Icon }: { title: string, viewKey: keyof typeof permissions, editKey: keyof typeof permissions, icon: any }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl mb-3 gap-4 sm:gap-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-white font-bold">{title}</h4>
          <p className="text-white/50 text-[10px] uppercase tracking-widest font-black">Module Access</p>
        </div>
      </div>
      <div className="flex items-center gap-6 sm:gap-4 w-full sm:w-auto justify-around sm:justify-end border-t border-white/5 pt-3 sm:pt-0 sm:border-0 mt-1 sm:mt-0">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-white/50 mb-1 font-black uppercase">View</span>
          <ToggleSwitch checked={permissions[viewKey]} onChange={() => handleToggle(viewKey)} disabled={isLoading} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-white/50 mb-1 font-black uppercase">Edit</span>
          <ToggleSwitch checked={permissions[editKey]} onChange={() => handleToggle(editKey)} disabled={isLoading} />
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            onClick={isLoading ? undefined : onClose}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] glass-morphism">
                {/* Header - Sticky */}
                <div className="p-5 sm:p-8 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-2.5 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Access Control</h3>
                      <p className="text-blue-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">{staffName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={onClose}
                    disabled={isLoading}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="p-5 sm:p-8 overflow-y-auto scrollbar-hide flex-grow custom-scrollbar">
                  <div className="space-y-1 mb-6">
                    <p className="text-white/40 text-[11px] sm:text-xs font-medium leading-relaxed">
                      Configure individual access rights for this staff member. 
                      Changes are logged for security auditing.
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-2">Commercial Hub</p>
                      <div className="space-y-3 sm:space-y-4">
                        <PermissionRow title="Finance" viewKey="canViewFinance" editKey="canEditFinance" icon={Database} />
                        <PermissionRow title="Sales" viewKey="canViewSales" editKey="canEditSales" icon={Banknote} />
                        <PermissionRow title="Customers" viewKey="canViewCustomers" editKey="canEditCustomers" icon={Users} />
                        <PermissionRow title="Inventory" viewKey="canViewInventory" editKey="canEditInventory" icon={LayoutDashboard} />
                      </div>
                    </div>

                    <div>
                      <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-2 mt-4">Operations</p>
                      <div className="space-y-3 sm:space-y-4">
                        <PermissionRow title="Livestock Units" viewKey="canViewBatches" editKey="canEditBatches" icon={Settings} />
                        <PermissionRow title="Houses" viewKey="canViewHouses" editKey="canEditHouses" icon={ThermometerSun} />
                        <PermissionRow title="Eggs" viewKey="canViewEggs" editKey="canEditEggs" icon={Egg} />
                        <PermissionRow title="Feeding" viewKey="canViewFeeding" editKey="canEditFeeding" icon={Wheat} />
                        <PermissionRow title="Mortality" viewKey="canViewMortality" editKey="canEditMortality" icon={XCircle} />
                      </div>
                    </div>

                    <div>
                      <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-2 mt-4">Governance</p>
                      <div className="space-y-3 sm:space-y-4">
                        <PermissionRow title="Team Management" viewKey="canViewTeam" editKey="canEditTeam" icon={Shield} />
                      </div>
                    </div>
                  </div>

                  {/* Warning Note for small screens */}
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                     <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1"> Security Policy </p>
                     <p className="text-white/60 text-[11px] leading-relaxed font-bold italic">
                        Owners bypass all checks. Managers are unrestricted by default unless limited here.
                     </p>
                  </div>
                </div>

                {/* Footer - Sticky */}
                <div className="p-5 sm:p-8 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 bg-white/5 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    onClick={onClose} 
                    disabled={isLoading}
                    className="w-full sm:w-auto rounded-xl border-white/10 hover:bg-white/5 text-[11px] uppercase font-black"
                  >
                    Discard
                  </Button>
                  <Button 
                    onClick={() => onSave(permissions)} 
                    isLoading={isLoading}
                    className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  >
                    Save & Apply
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none disabled:opacity-50 ring-offset-black focus:ring-2 focus:ring-emerald-500 ring-offset-2 ${checked ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}
