import React from 'react';
import { getDesktopLicenses } from '@/lib/actions/licenses';
import ConnectedDevicesClient from './ConnectedDevicesClient';

export default async function ConnectedDevicesPage() {
  const { licenses } = await getDesktopLicenses();
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Connected <span className="text-emerald-400">Devices</span>
        </h1>
        <p className="text-white/70 mt-2">
          Every desktop or mobile device linked to this farm. Devices
          automatically receive access when your farm subscription is active.
        </p>
      </div>
      <ConnectedDevicesClient licenses={licenses} />
    </div>
  );
}
