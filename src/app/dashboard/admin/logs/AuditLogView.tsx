'use client';

import React, { useState, useTransition } from 'react';
import { 
  History, 
  Trash2, 
  PlusCircle, 
  RotateCcw, 
  User, 
  Calendar, 
  Table, 
  ShieldCheck,
  Search,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { restoreDeletedRecord } from '@/lib/actions/audit-actions';
import { toast } from 'sonner';

interface AuditLogViewProps {
  initialInsertLogs: any[];
  initialDeleteLogs: any[];
}

export default function AuditLogView({ initialInsertLogs, initialDeleteLogs }: AuditLogViewProps) {
  const [activeTab, setActiveTab] = useState<'inserts' | 'deletes'>('inserts');
  const [isPending, startTransition] = useTransition();

  const handleRestore = (id: number) => {
    if (!confirm('Are you sure you want to restore this data? This will create a new record with the deleted values.')) return;
    
    startTransition(async () => {
      const res = await restoreDeletedRecord(id);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Security <span className="text-emerald-400 italic">Audit</span>
          </h1>
          <p className="text-white/60 text-sm font-medium mt-1 uppercase tracking-widest">
            System Activity & Data Recovery
          </p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('inserts')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === 'inserts' 
                ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Insertions
          </button>
          <button
            onClick={() => setActiveTab('deletes')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === 'deletes' 
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Deletions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'inserts' ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Resource Creations
              </CardTitle>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                Last 100 Records
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Timestamp</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Worker</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Table</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Record ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {initialInsertLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-white/90 font-medium text-xs">
                            <Calendar className="w-3.5 h-3.5 text-white/30" />
                            {new Date(log.insertedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                              {log.user?.firstname?.[0]}{log.user?.surname?.[0]}
                            </div>
                            <div className="text-xs">
                              <p className="text-white font-bold">{log.user?.firstname} {log.user?.surname}</p>
                              <p className="text-[9px] text-white/40 uppercase font-bold">{log.user?.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/5">
                            {log.targetTable}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-emerald-400 font-bold">
                          #{log.recordId}
                        </td>
                      </tr>
                    ))}
                    {initialInsertLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-white/30 italic text-sm">
                          No insertion logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Recovery Vault
              </CardTitle>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                Deleted Records
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Deleted At</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">By Whom</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Entity</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Data Summary</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold text-white/50 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {initialDeleteLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-white/90 font-medium text-xs">
                          {new Date(log.deletedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400">
                              {log.user?.firstname?.[0]}{log.user?.surname?.[0]}
                            </div>
                            <span className="text-xs text-white/90 font-bold">{log.user?.firstname}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                            {log.tableName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] text-white/40 font-mono truncate max-w-[200px]">
                            {log.deletedDataCsv.split('\n')[1]?.slice(0, 50)}...
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRestore(log.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                    {initialDeleteLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-white/30 italic text-sm">
                          No deletion logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
