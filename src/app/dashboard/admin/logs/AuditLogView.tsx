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
  ArrowRight,
  Eye
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { restoreDeletedRecord } from '@/lib/actions/audit-actions';
import { toast } from 'sonner';
import { WorkerStamp } from '@/components/ui/WorkerStamp';

interface AuditLogViewProps {
  initialEditLogs: any[];
  initialDeleteLogs: any[];
}

export default function AuditLogView({ initialEditLogs, initialDeleteLogs }: AuditLogViewProps) {
  const [activeTab, setActiveTab] = useState<'edits' | 'deletes'>('edits');
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const uniqueDeleteLogs = initialDeleteLogs.filter((log, index, self) =>
    index === self.findIndex((t) => (
      t.tableName === log.tableName && t.deletedDataCsv === log.deletedDataCsv
    ))
  );

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
            onClick={() => setActiveTab('edits')}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === 'edits' 
                ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            Edits
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
        {activeTab === 'edits' ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Resource Modifications
              </CardTitle>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                Last 100 Edits
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Timestamp</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Worker</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Table / Entity</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-white/50 uppercase tracking-widest">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {initialEditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-white/90 font-medium text-xs">
                            <Calendar className="w-3.5 h-3.5 text-white/30" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <WorkerStamp user={log.user} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/5 w-fit">
                              {log.tableName}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              ID: #{log.recordId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                              Attribute: <span className="text-emerald-400/80">{log.attributeName}</span>
                            </p>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-red-400/60 line-through truncate max-w-[100px]">{log.oldValue || 'none'}</span>
                              <ArrowRight className="w-3 h-3 text-white/20" />
                              <span className="text-emerald-400 font-bold truncate max-w-[100px]">{log.newValue}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {initialEditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-white/30 italic text-sm">
                          No modification logs found.
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
                    {uniqueDeleteLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-white/90 font-medium text-xs">
                          {new Date(log.deletedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <WorkerStamp user={log.user} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                            {log.tableName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-white/40 font-mono truncate max-w-[200px]" title={log.deletedDataCsv}>
                              {log.deletedDataCsv.split('\n')[1]?.slice(0, 50)}...
                            </p>
                            <button 
                              onClick={() => setSelectedLog(log)}
                              className="text-white/40 hover:text-emerald-400 transition-colors" 
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                    {uniqueDeleteLogs.length === 0 && (
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

      <Dialog 
        isOpen={!!selectedLog} 
        onOpenChange={(open) => !open && setSelectedLog(null)}
        title="Deleted Record Details"
        description={selectedLog ? `Entity: ${selectedLog.tableName} | Deleted: ${new Date(selectedLog.deletedAt).toLocaleString()}` : ''}
      >
        {selectedLog && (
          <div className="bg-black/20 border border-white/10 p-4 rounded-md overflow-x-auto mt-4 custom-scrollbar">
            <table className="w-full text-left text-xs text-white/90">
              <tbody>
                {selectedLog.deletedDataCsv.split('\n')[0].split('|').map((header: string, i: number) => {
                  const cleanHeader = header.trim().replace(/^"|"$/g, '').replace(/_/g, ' ').toUpperCase();
                  const value = selectedLog.deletedDataCsv.split('\n')[1]?.split('|')[i]?.trim().replace(/^'|'$/g, '').replace(/''/g, "'") || 'N/A';
                  return (
                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-bold text-white/50 tracking-widest">{cleanHeader}</td>
                      <td className="py-2 px-3 font-mono">{value === 'NULL' || value === '' ? <span className="text-white/30 italic">none</span> : value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  const id = selectedLog.id;
                  setSelectedLog(null);
                  handleRestore(id);
                }}
                disabled={isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-2 rounded-md font-bold uppercase text-[10px] tracking-widest transition-all hover:scale-105 disabled:opacity-50"
              >
                Restore Record
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
