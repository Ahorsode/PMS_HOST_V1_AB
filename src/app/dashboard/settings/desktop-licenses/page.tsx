import React from 'react';
import { getDesktopLicenses } from '@/lib/actions/licenses';
import DesktopLicensesClient from './DesktopLicensesClient';

export default async function DesktopLicensesPage() {
  const data = await getDesktopLicenses();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Desktop License <span className="text-emerald-400">Management</span></h1>
        <p className="text-white/70 mt-2">Manage your offline terminal licenses for the Poultry PMS companion app.</p>
      </div>
      
      <DesktopLicensesClient initialPaid={data.isPaid} initialLicenses={data.licenses} />
    </div>
  );
}
