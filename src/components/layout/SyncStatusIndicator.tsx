'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SyncStatus {
  pending: number;
  lastSync: string | null;
  status: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE' | 'ONLINE_SYNCED';
}

/**
 * SyncStatusIndicator Component
 * Displays a modern, glassmorphism-styled status of the local outbox.
 * Listens to IPC events from the Electron main process.
 */
export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    lastSync: null,
    status: 'IDLE'
  });

  const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;

  useEffect(() => {
    if (!isDesktop) return;

    // Trigger immediate sync attempt when navigator reports coming back online
    const handleOnline = () => {
      (window as any).electronAPI.sendDataRequest('trigger-sync', {});
    };
    window.addEventListener('online', handleOnline);

    // Request initial state from main process
    (window as any).electronAPI.sendDataRequest('get-sync-status', {});

    // Subscribe to background worker status updates
    const cleanup = (window as any).electronAPI.onDataResponse('sync-status-update', (data: SyncStatus) => {
      setStatus(data);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      cleanup?.();
    };
  }, [isDesktop]);

  if (!isDesktop) return null;

  const getStatusConfig = () => {
    switch (status.status) {
      case 'SYNCING':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />,
          text: `Syncing ${status.pending} Records...`,
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          pulse: false
        };
      case 'OFFLINE':
        return {
          icon: <CloudOff className="w-4 h-4 text-gray-400" />,
          text: 'Working Offline',
          color: "text-gray-400",
          bgColor: "bg-gray-500/5",
          pulse: false
        };
      case 'ERROR':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          text: 'Sync Error - Retrying',
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          pulse: true
        };
      case 'ONLINE_SYNCED':
      default:
        if (status.pending > 0) {
          return {
            icon: <Cloud className="w-4 h-4 text-amber-400" />,
            text: `${status.pending} Logs Pending`,
            color: "text-amber-400",
            bgColor: "bg-amber-500/10",
            pulse: true
          };
        }
        return {
          icon: <Cloud className="w-4 h-4 text-emerald-400" />,
          text: 'Cloud Synchronized',
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          pulse: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500",
        "bg-white/5 border border-white/10 backdrop-blur-lg shadow-xl",
        config.bgColor,
        config.pulse && "animate-pulse"
      )}
    >
      <div className="flex-shrink-0 flex items-center justify-center">
        {config.icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={cn("text-[10px] font-black uppercase tracking-[0.05em] leading-tight truncate", config.color)}>
          {config.text}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={cn("w-1 h-1 rounded-full", status.status === 'OFFLINE' ? "bg-gray-600" : "bg-emerald-500")} />
          {status.lastSync ? (
            <span className="text-[8px] text-white/30 font-bold leading-tight">
              Last: {new Date(status.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-[8px] text-white/30 font-bold leading-tight uppercase">Ready</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
