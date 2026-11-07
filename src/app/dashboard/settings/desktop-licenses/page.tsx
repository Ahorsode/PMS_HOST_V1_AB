import React from 'react';
import Link from 'next/link';
import { getDesktopLicenses } from '@/lib/actions/licenses';
import ConnectedDevicesClient from './ConnectedDevicesClient';
import { ArrowLeft } from 'lucide-react';

export default async function ConnectedDevicesPage() {
  const { licenses } = await getDesktopLicenses();
  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 pt-2 pb-8 md:py-8">
      <Link
        href="/dashboard/settings?tab=farm"
        className="inline-flex items-center gap-2 text-sm font-medium text-fg/60 hover:text-fg transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl font-medium leading-tight text-fg">Connected devices</h1>
        <p className="mt-2 text-sm text-fg-2">
          Desktop and mobile devices linked to this farm. They get access while your farm plan is active.
        </p>
      </div>
      <ConnectedDevicesClient licenses={licenses} />
    </div>
  );
}
