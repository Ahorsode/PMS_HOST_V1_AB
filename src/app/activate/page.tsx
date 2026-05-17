'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Shield, ArrowRight, Loader2, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ActivatePage() {
  const [farmId, setFarmId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'syncing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && 'electronAPI' in window);
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId.trim() || !licenseKey.trim()) return;

    setStatus('submitting');
    setStatusMessage('Authenticating terminal details...');
    setError('');

    try {
      if (!isElectron) {
        // Mock success in web browser preview mode
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setStatus('syncing');
        setStatusMessage('Reconciling local synchronization logs...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setStatus('success');
        setStatusMessage('Terminal activated successfully!');
        return;
      }

      // Invoke Electron main process IPC handler
      const result = await (window as any).electronAPI.invoke('activate-terminal', {
        farmId: farmId.trim(),
        licenseKey: licenseKey.trim(),
      });

      if (!result.success) {
        setError(result.error || 'Activation failed. Please check your credentials.');
        setStatus('error');
        return;
      }

      // Success sequence
      setStatus('syncing');
      setStatusMessage('Decrypting secure local storage outbox...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setStatus('success');
      setStatusMessage('Terminal ready. Loading staff dashboard...');
      
      // Delay slightly for smooth visual transition
      setTimeout(() => {
        // Redirect to dashboard (will reload application normally under 1280x800)
        window.location.href = '/dashboard';
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during terminal handshake.');
      setStatus('error');
    }
  };

  return (
    <main className="relative min-h-screen bg-[#070707] flex items-center justify-center overflow-hidden px-4">
      {/* Dynamic Futuristic Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Cybernetic Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        <AnimatePresence mode="wait">
          {status !== 'success' ? (
            <motion.div
              key="activation-panel"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Premium Card Container */}
              <div className="bg-black/60 backdrop-blur-2xl border border-white/[0.08] rounded-lg p-8 shadow-2xl shadow-emerald-950/10 overflow-hidden relative group">
                {/* Visual indicator when not in Electron */}
                {!isElectron && (
                  <div className="mb-5 bg-amber-500/10 border border-amber-500/20 rounded-md p-3 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-400">Web Preview Mode</h4>
                      <p className="text-[11px] text-white/60 mt-0.5">Hardware safeStorage fingerprint binding will be simulated.</p>
                    </div>
                  </div>
                )}

                {/* Header branding */}
                <div className="flex flex-col items-center text-center space-y-4 mb-6">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-md flex items-center justify-center shadow-inner">
                    <Shield className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Activate Terminal</h1>
                    <p className="text-xs text-white/60 mt-1">Bind this physical terminal to your active farm network seat.</p>
                  </div>
                </div>

                {/* Main Action Form */}
                <form onSubmit={handleActivate} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5 pl-0.5">
                      Farm Identification Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={farmId}
                        onChange={(e) => setFarmId(e.target.value)}
                        placeholder="e.g. clx890123"
                        disabled={status === 'submitting' || status === 'syncing'}
                        required
                        className="w-full h-11 pl-4 pr-3 bg-[#0a0a0a] border border-white/10 rounded-md text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-medium shadow-inner disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5 pl-0.5">
                      Device License Key
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Key className="w-4 h-4 text-white/30" />
                      </div>
                      <input
                        type="text"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="PMS-XXXX-XXXX-XXXX"
                        disabled={status === 'submitting' || status === 'syncing'}
                        required
                        className="w-full h-11 pl-10 pr-3 bg-[#0a0a0a] border border-white/10 rounded-md text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-semibold tracking-normal shadow-inner disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-3 rounded-md leading-relaxed">
                      {error}
                    </div>
                  )}

                  {/* Status Indicator */}
                  {(status === 'submitting' || status === 'syncing') && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-md flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{statusMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting' || status === 'syncing' || !farmId.trim() || !licenseKey.trim()}
                    className="relative w-full h-12 bg-white hover:bg-gray-100 disabled:bg-white/10 text-black disabled:text-white/30 rounded-md font-bold text-sm transition-all hover:scale-[1.01] active:scale-95 disabled:hover:scale-100 flex items-center justify-center shadow-lg shadow-white/5"
                  >
                    <span>Activate Terminal Seat</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </form>

                {/* Footer Guide Info */}
                <div className="mt-6 pt-5 border-t border-white/[0.06] flex gap-2.5 items-start text-white/50 text-[10px] leading-normal pl-0.5">
                  <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    To retrieve your license token, open the **Web Settings Dashboard** under the **"Desktop App Licenses"** tab. Pre-purchased seats must be generated by the farm owner.
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.25)]">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">System Unlocked</h2>
                <p className="text-xs text-white/60 max-w-[280px] leading-relaxed">{statusMessage}</p>
              </div>
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mt-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
