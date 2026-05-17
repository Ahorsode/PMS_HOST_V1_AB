'use client'

import React, { useEffect, useState } from 'react';
import { dataService } from '@/services/dataService';
import { Card } from '@/components/ui/Card';
import { XCircle, Activity, History, AlertTriangle, Eye, Home, Plus, Skull } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatLivestockType } from '@/lib/utils/growth-utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { QuickMortalityLogger } from './QuickMortalityLogger';
import { InfirmaryManagement } from '../flocks/InfirmaryManagement';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IsolationRoomForm } from './IsolationRoomForm';
import { useSession } from 'next-auth/react';

export default function MortalityPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isolationRooms, setIsolationRooms] = useState<any[]>([]);

  const userRole = session?.user?.role || 'WORKER';
  const canEdit = ['OWNER', 'MANAGER', 'ADMIN'].includes(userRole);

  useEffect(() => {
    async function fetchData() {
      try {
        const [l, b, i] = await Promise.all([
          dataService.query<any>({ sql: 'SELECT * FROM mortality ORDER BY logDate DESC' }),
          dataService.query<any>({ sql: 'SELECT * FROM batches' }),
          dataService.query<any>({ sql: 'SELECT * FROM isolation_rooms' })
        ]);
        setLogs(l);
        setBatches(b);
        setIsolationRooms(i);
      } catch (err) {
        console.error('Failed to fetch mortality data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-white font-bold animate-pulse">Analyzing health records...</div>;

  const activeBatches = batches.filter((b: any) => b.status === 'active');
  const totalMortality = logs.reduce((acc: number, log: any) => acc + (log.status === 'DEAD' ? log.count : 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
            <span className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
              <Skull className="w-10 h-10 text-red-500" />
            </span>
            Mortality <span className="text-red-500">&amp;</span> Quarantine
          </h2>
          <div className="flex items-center gap-2 text-gray-400 font-medium">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Health Analytics &amp; Active Isolation Tracking</span>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/dashboard/flocks" className="flex-1 md:flex-initial">
            <Button variant="glass" size="sm" className="w-full gap-2 border-white/5 bg-white/5">
              <Home className="w-4 h-4" /> Batch View
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative overflow-hidden bg-red-950/80 border border-red-900/50 text-white p-6 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <XCircle className="w-24 h-24 text-red-500" />
          </div>
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">Total Deaths (History)</p>
          <h3 className="text-4xl font-bold">{totalMortality.toLocaleString()} <span className="text-xs font-normal text-red-200">livestock</span></h3>
          <p className="text-red-500/80 text-xs mt-3 font-medium italic">Across all active &amp; archived batches</p>
        </div>

        <div className="bg-[#111827] p-6 rounded-xl shadow-xl border-l-4 border-l-amber-500 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="text-gray-300 text-xs font-bold uppercase tracking-widest">Health Tip</p>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            Consistent mortality logging helps identify early signs of disease. If mortality exceeds 1% in 24 hours, contact a veterinarian immediately.
          </p>
        </div>
      </div>

      {/* Quick Logger */}
      {canEdit && (
        <div className="bg-[#111827] p-6 rounded-xl shadow-xl border border-gray-800">
          <QuickMortalityLogger activeBatches={activeBatches} isolationRooms={JSON.parse(JSON.stringify(isolationRooms))} />
        </div>
      )}

      {/* Isolation Room Management */}
      <div className="bg-[#111827] p-6 rounded-xl shadow-xl border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Isolation Rooms</h2>
            <p className="text-sm text-gray-400">Configure dedicated housing for sick or quarantined birds.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IsolationRoomForm />
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isolationRooms.length > 0 ? isolationRooms.map((room: any) => (
                <div key={room.id} className="p-5 bg-[#1F2937] border border-gray-700 rounded-xl hover:border-amber-500/50 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-100">{room.name}</h4>
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded">Active</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Capacity: <span className="text-gray-200 font-medium">{room.capacity} birds</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 bg-[#1F2937]/50 rounded-xl border border-dashed border-gray-700">
                  <Home className="w-12 h-12 mb-3 opacity-30 text-amber-500" />
                  <p className="font-medium">No isolation rooms configured yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Active Isolation Management */}
        <div className="mt-8 border-t border-gray-800 pt-6">
          <InfirmaryManagement batches={batches} />
        </div>
      </div>

      {/* Historical Log */}
      <div className="bg-[#111827] rounded-xl shadow-xl border border-gray-800 overflow-hidden">
        <div className="bg-red-950/40 px-6 py-4 border-b border-gray-800 flex items-center gap-2">
          <History className="w-4 h-4 text-red-400" />
          <h3 className="font-bold text-red-400 uppercase tracking-wide text-sm">Historical Mortality Record</h3>
        </div>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead>
              <tr className="bg-[#1F2937]/50">
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Batch</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Count</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Isolation</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map((log: any) => (
                <tr key={`desk-${log.id}`} className="hover:bg-[#1F2937] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-300 font-medium">{formatDate(log.logDate)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-gray-100">
                    {(() => {
                      const batch = batches.find(b => b.id === log.batchId);
                      return batch ? (batch.batchName || `UNT-${batch.id.substring(0, 5)}`) : `UNT-${log.batchId?.substring(0, 5)}`;
                    })()} ({formatLivestockType(batches.find(b => b.id === log.batchId)?.type)})
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-lg text-red-500 font-bold italic">{log.count}</td>
                  <td className="px-5 py-3 text-sm text-gray-400 font-medium">
                    <div className="flex flex-col">
                      <span className="text-gray-200 font-bold italic">{log.category} {log.subCategory ? `› ${log.subCategory}` : ''}</span>
                      {log.reason && <span className="text-xs text-gray-500 mt-1">{log.reason}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-center">
                    {(() => {
                      const room = isolationRooms.find(r => r.id === log.isolationRoomId);
                      return room ? (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase rounded border border-amber-500/20">
                          {room.name}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs italic">None</span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/flocks/${log.batchId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
                    >
                      <Eye className="h-3 w-3" /> Explore
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden flex flex-col gap-3 p-3">
          {logs.map((log: any) => (
            <div key={`mob-${log.id}`} className="bg-[#1F2937] border border-gray-700 p-3 rounded-lg shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{formatDate(log.logDate)}</span>
                <span className="text-sm font-bold text-gray-200 bg-gray-800 px-2 py-1 rounded-full uppercase tracking-widest">
                  {(() => {
                    const batch = batches.find(b => b.id === log.batchId);
                    return batch ? (batch.batchName || `UNT-${batch.id.substring(0, 5)}`) : `UNT-${log.batchId?.substring(0, 5)}`;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-4xl font-bold text-red-500">-{log.count}</h4>
                  <div className="flex items-center mt-1 gap-1">
                    <span className="text-xs font-bold text-gray-300">{log.category}</span>
                    <span className="text-gray-600">›</span>
                    <span className="text-xs font-bold text-gray-400">{log.subCategory}</span>
                  </div>
                  <div className="mt-2">
                    {log.isolationRoom ? (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase rounded border border-amber-500/20">
                        Room: {log.isolationRoom.name}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-[10px] italic">No room assigned</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/flocks/${log.batchId}`}
                  className="flex items-center justify-center px-4 py-2 text-xs font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md"
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Link>
              </div>
            </div>
          ))}
        </div>
        {logs.length === 0 && (
          <div className="py-24 text-center">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-medium italic">All livestock units are healthy! No mortality logs recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}

