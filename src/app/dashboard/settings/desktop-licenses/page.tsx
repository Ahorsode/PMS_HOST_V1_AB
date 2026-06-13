import React from 'react';
import { getDesktopLicenses } from '@/lib/actions/licenses';
import DesktopLicensesClient from './DesktopLicensesClient';

export default async function DesktopLicensesPage() {
  const { licenses, isPaid } = await getDesktopLicenses();
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Desktop <span className="text-emerald-400">Access Status</span>
        </h1>
        <p className="text-white/70 mt-2">
          View all registered desktop devices and their subscription status.
          Upgrades made on this page instantly unlock the desktop app.
        </p>
      </div>
      <DesktopLicensesClient licenses={licenses} isPaid={isPaid} />
    </div>
  );
}
