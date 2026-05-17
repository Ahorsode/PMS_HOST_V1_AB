'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function DesktopSyncManager() {
  const { data: session } = useSession();
  const registrationAttempted = useRef(false);

  useEffect(() => {
    // Check if we are running in Electron
    const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;
    
    if (isDesktop && session?.user && !registrationAttempted.current) {
      const electron = (window as any).electronAPI;

      const registerDevice = async () => {
        registrationAttempted.current = true;
        
        // 1. Get unique hardware info from Electron Main process
        electron.sendDataRequest('get-device-info', {});
        
        const cleanup = electron.onDataResponse('get-device-info', async (deviceInfo: any) => {
          if (deviceInfo.error) {
            console.error('[DesktopSyncManager] Failed to get device info:', deviceInfo.error);
            return;
          }

          try {
            console.log('[DesktopSyncManager] Registering hardware with cloud gateway:', deviceInfo.deviceId);
            
            // 2. Register this device instance with the farm in the cloud
            const response = await fetch('/api/devices/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId: deviceInfo.deviceId,
                deviceName: deviceInfo.deviceName,
                deviceType: deviceInfo.deviceType,
                farmId: session.user.activeFarmId
              })
            });

            if (!response.ok) throw new Error('Cloud registration failed');
            
            const result = await response.json();
            const deviceToken = result.device.id; 

            // 3. Save the fully verified auth + device bundle to Electron's safeStorage
            const authData = {
              sessionToken: (session as any).accessToken || 'session-active',
              licenseKey: (session.user as any).farmLicenseKey || 'DEMO-LICENSE',
              deviceToken: deviceToken,
              farmId: session.user.activeFarmId,
              userId: session.user.id
            };

            electron.sendDataRequest('save-auth-data', authData);
            console.log('[DesktopSyncManager] Device verified and auth bridged successfully.');
            
            // Success toast only on first registration success
            toast.success('Desktop synchronization active');
          } catch (err) {
            console.error('[DesktopSyncManager] Sync Bridge Error:', err);
            toast.error('Sync initialization failed. Check connection.');
          } finally {
            cleanup();
          }
        });
      };

      registerDevice();
    }
  }, [session]);

  return null;
}
