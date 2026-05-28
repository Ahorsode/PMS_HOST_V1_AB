"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Monitor, CreditCard, Key, Copy, CheckCircle2, Loader2, ShieldCheck, DownloadCloud } from 'lucide-react';
import { purchaseDesktopLicenseBundle } from '@/lib/actions/licenses';

interface License {
  id: string;
  deviceName: string | null;
  licenseKey: string | null;
  status: string;
  hardwareId: string | null;
  licenseExpiresAt?: Date | string | null;
}

interface DesktopLicensesClientProps {
  initialPaid: boolean;
  initialLicenses: License[];
}

export default function DesktopLicensesClient({ initialPaid, initialLicenses }: DesktopLicensesClientProps) {
  const [licenses] = useState<License[]>(initialLicenses);
  const hasRegistrations = licenses.length > 0;
  
  const [viewState, setViewState] = useState<'PITCH' | 'CHECKOUT' | 'ALLOCATION' | 'MANAGEMENT'>(
    initialPaid || hasRegistrations ? 'MANAGEMENT' : 'PITCH'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [seatCount, setSeatCount] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dummy checkout fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    // Simulate gateway delay
    setTimeout(() => {
      setIsLoading(false);
      setViewState('ALLOCATION');
    }, 1500);
  };

  const handleGenerateKeys = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await purchaseDesktopLicenseBundle(seatCount);
      if (res.success) {
        // We'll need to refresh the page or reload data
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate keys.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (viewState === 'PITCH') {
    return (
      <Card className="border border-emerald-500/20 bg-gradient-to-br from-black/60 to-emerald-950/20 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
          <DownloadCloud className="w-64 h-64 text-emerald-400" />
        </div>
        <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <Monitor className="w-4 h-4" />
              Pro Feature
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">Desktop Companion App</h2>
            <p className="text-lg text-white/80 leading-relaxed font-medium max-w-2xl">
              Bring Poultry PMS directly to your farm&apos;s physical terminals. Enable local data resilience, faster offline operations, and multi-office synchronization seamlessly.
            </p>
            <div className="pt-4">
              <Button 
                onClick={() => setViewState('CHECKOUT')} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              >
                Purchase Desktop License Bundle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewState === 'CHECKOUT') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#111] border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
          <CardHeader className="border-b border-white/5 pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                Secure Checkout
              </CardTitle>
              <button onClick={() => setViewState('PITCH')} disabled={isLoading} className="text-white/40 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">&times;</button>
            </div>
            <p className="text-sm text-white/50 mt-1">One-time payment for perpetual local terminal access.</p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCheckoutSubmit} className="space-y-5">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center mb-6">
                <span className="font-medium text-white/80">Desktop License Bundle</span>
                <span className="text-xl font-bold text-white">$199.00</span>
              </div>
              
              <div className="space-y-4">
                <Input 
                  label="Card Number" 
                  placeholder="0000 0000 0000 0000" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Expiry Date" 
                    placeholder="MM/YY" 
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                  <Input 
                    label="CVV" 
                    placeholder="123" 
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-emerald-500 hover:bg-emerald-600" isLoading={isLoading} loadingText="Authorizing...">
                  Authorize Payment ($199)
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === 'ALLOCATION') {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Payment Successful</CardTitle>
          <p className="text-white/70 mt-2">Configure your physical computer terminals.</p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <label className="block text-lg font-medium text-white">
                How many physical computer terminals (Offices, Gate Houses, Barns) do you want to assign to this farm?
              </label>
              
              <div className="flex items-center justify-center gap-4">
                <button 
                  type="button"
                  onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                  disabled={isLoading}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xl flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <div className="w-24 h-16 bg-black/50 border border-white/20 rounded-xl flex items-center justify-center text-3xl font-black text-white">
                  {seatCount}
                </div>
                <button 
                  type="button"
                  onClick={() => setSeatCount(seatCount + 1)}
                  disabled={isLoading}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xl flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <Button 
              onClick={handleGenerateKeys} 
              isLoading={isLoading}
              loadingText="Generating keys..."
              className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <Key className="w-5 h-5 mr-2" />
              Confirm Seat Count & Generate Keys
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // MANAGEMENT STATE
  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Key className="w-5 h-5 text-emerald-400" />
          Active Terminal Keys
        </CardTitle>
        <p className="text-sm text-white/60">Input these cryptographic keys into your desktop application to bind the hardware to your farm.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/50 font-bold">
                <th className="p-4 pl-0">Terminal Name</th>
                <th className="p-4">Secret License Key</th>
                <th className="p-4">Binding Status</th>
                <th className="p-4 pr-0">Hardware ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {licenses.map((license) => (
                <tr key={license.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 pl-0 font-medium text-white flex items-center gap-3">
                    <Monitor className="w-4 h-4 text-emerald-400/70" />
                    {license.deviceName}
                  </td>
                  <td className="p-4">
                    <div className="inline-flex items-center gap-2 bg-black/60 border border-white/10 rounded-md px-3 py-1.5 group">
                      <code className="font-mono text-sm text-emerald-300 tracking-wider">
                        {license.licenseKey}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(license.licenseKey || '')}
                        className="text-white/40 hover:text-white transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === license.licenseKey ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    {license.hardwareId ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Bound
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-0 text-white/50 font-mono text-sm truncate max-w-[150px]" title={license.hardwareId || ''}>
                    {license.hardwareId || 'Awaiting Connection...'}
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/50 font-medium">
                    No active terminal licenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
