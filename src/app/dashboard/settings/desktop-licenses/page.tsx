import React from 'react';
import { getDesktopActivationHubData } from '@/lib/actions/licenses';
import DesktopLicensesClient from './DesktopLicensesClient';
import { redirect } from 'next/navigation';

const SHOW_USER_DESKTOP_LICENSES = process.env.NEXT_PUBLIC_SHOW_USER_DESKTOP_LICENSES !== 'false';

export default async function DesktopLicensesPage() {
  if (!SHOW_USER_DESKTOP_LICENSES) {
    redirect('/dashboard/settings');
  }

  const data = await getDesktopActivationHubData();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Desktop <span className="text-emerald-400">Evaluation Hub</span></h1>
        <p className="text-white/70 mt-2">Generate your activation key, verify your Farm ID, and track your desktop evaluation countdown.</p>
      </div>
      
      <DesktopLicensesClient initialData={data} />
    </div>
  );
}
