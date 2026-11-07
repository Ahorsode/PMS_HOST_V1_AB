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
  Eye,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { restoreDeletedRecord } from '@/lib/actions/audit-actions';
import { toast } from 'sonner';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import { MobileCardList } from '@/components/ui/MobileCardList';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';

import { restoreBatch } from '@/lib/actions/batch-actions';
import { restoreEggProduction } from '@/lib/actions/egg-actions';
import { restoreFeedingLog } from '@/lib/actions/feed-actions';
import { restoreExpense } from '@/lib/actions/expense-actions';
import { restoreSale } from '@/lib/actions/sale-actions';
import { restoreOrder } from '@/lib/actions/order-actions';
import { restoreInventory } from '@/lib/actions/inventory-actions';
import { useRouter } from 'next/navigation';

interface AuditLogViewProps {
  initialEditLogs: any[];
  initialDeleteLogs: any[];
  trashItems: any;
}

export default function AuditLogView({ initialEditLogs, initialDeleteLogs, trashItems }: AuditLogViewProps) {
  const [activeTab, setActiveTab] = useState<'edits' | 'deletes' | 'recovery'>('edits');
  const [, startTransition] = useTransition();
  const [restoringKeys, setRestoringKeys] = useState<Set<string>>(() => new Set());
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const router = useRouter();

  // Count total soft-deleted records for the badge
  const trashCount = trashItems ? Object.values(trashItems as Record<string, any[]>).reduce((s: number, a: any[]) => s + a.length, 0) : 0;

  const uniqueDeleteLogs = initialDeleteLogs.filter((log, index, self) =>
    index === self.findIndex((t) => (
      t.tableName === log.tableName && t.deletedDataCsv === log.deletedDataCsv
    ))
  );

  const setRestoreActive = (key: string, active: boolean) => {
    setRestoringKeys((prev) => {
      const next = new Set(prev);
      if (active) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const isRestoring = (key: string) => restoringKeys.has(key);

  const handleRestore = (id: string) => {
    const restoreKey = `audit:${id}`;
    if (isRestoring(restoreKey)) return;
    if (!confirm('Are you sure you want to restore this data? This will create a new record with the deleted values.')) return;
    
    setRestoreActive(restoreKey, true);
    startTransition(async () => {
      try {
        const res = await restoreDeletedRecord(id);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.error);
        }
      } finally {
        setRestoreActive(restoreKey, false);
      }
    });
  };

  const handleSoftRestore = (restoreFn: (id: string) => Promise<any>, id: string, label: string) => {
    const restoreKey = `${label}:${id}`;
    if (isRestoring(restoreKey)) return;
    if (!confirm(`Restore this ${label}? It will reappear in its original module.`)) return;
    setRestoreActive(restoreKey, true);
    startTransition(async () => {
      try {
        const res = await restoreFn(id);
        if (res.success) {
          toast.success(`${label} restored successfully`);
          router.refresh();
        } else {
          toast.error(res.error || `Failed to restore ${label}`);
        }
      } finally {
        setRestoreActive(restoreKey, false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-medium leading-tight text-fg">Audit log</h1>
          <p className="mt-2 text-sm text-fg-2">
            Who changed what, and records you can restore
          </p>
        </div>
        
        <div className="flex bg-fg/5 p-1 rounded-xl border border-fg/10">
          <button
            onClick={() => setActiveTab('edits')}
            className={`px-6 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'edits' 
                ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' 
                : 'text-fg/60 hover:text-fg'
            }`}
          >
            Edits
          </button>
          <button
            onClick={() => setActiveTab('deletes')}
            className={`px-6 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'deletes' 
                ? 'bg-red-500 text-white' 
                : 'text-fg/60 hover:text-fg'
            }`}
          >
            Deletions
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={`relative px-6 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'recovery' 
                ? 'bg-raised-2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' 
                : 'text-fg/60 hover:text-fg'
            }`}
          >
            Recovery
            {trashCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
                {trashCount > 9 ? '9+' : trashCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'edits' ? (
          <Card className="bg-fg/5 border-fg/10 overflow-hidden">
            <CardHeader className="border-b border-fg/5 flex flex-row items-center justify-between">
              <CardTitle className="text-fg flex items-center gap-2">
                <History className="w-5 h-5 text-fg-3" />
                Resource modifications
              </CardTitle>
              <div className="text-xs font-medium text-fg/40">
                Last 100 edits
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <MobileCardList
                items={initialEditLogs}
                getKey={(log) => log.id}
                title={(log) => new Date(log.createdAt).toLocaleString()}
                subtitle={(_log, index) => <span className="font-mono text-fg font-medium">Change {index + 1}</span>}
                badge={(log) => (
                  <span className="bg-fg/10 text-fg/70 px-2 py-0.5 rounded text-xs font-medium border border-fg/5">
                    {log.tableName}
                  </span>
                )}
                fields={(log) => [
                  { label: 'Worker', full: true, value: <WorkerStamp user={log.user} /> },
                  { label: 'Attribute', full: true, value: <span className="text-fg">{log.attributeName}</span> },
                  { label: 'Old value', value: <span className="text-neg line-through">{log.oldValue || 'none'}</span> },
                  { label: 'New value', value: <span className="text-fg font-medium">{log.newValue}</span> },
                ]}
                empty="No modification logs found."
              />
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-fg/5">
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Timestamp</th>
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Worker</th>
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Table / entity</th>
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fg/5">
                    {initialEditLogs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-fg/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-fg/90 font-medium text-xs">
                            <Calendar className="w-3.5 h-3.5 text-fg/30" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <WorkerStamp user={log.user} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="bg-fg/10 text-fg/70 px-2 py-0.5 rounded text-xs font-medium border border-fg/5 w-fit">
                              {log.tableName}
                            </span>
                            <span className="text-xs font-mono text-fg font-medium">
                              Change {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-fg/40 font-medium">
                              Attribute: <span className="text-fg">{log.attributeName}</span>
                            </p>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-neg line-through truncate max-w-[100px]">{log.oldValue || 'none'}</span>
                              <ArrowRight className="w-3 h-3 text-fg/20" />
                              <span className="text-fg font-medium truncate max-w-[100px]">{log.newValue}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {initialEditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-fg/60 text-sm">
                          No modification logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : activeTab === 'deletes' ? (
          <Card className="bg-fg/5 border-fg/10 overflow-hidden">
            <CardHeader className="border-b border-fg/5 flex flex-row items-center justify-between">
              <CardTitle className="text-fg flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-neg" />
                Recovery vault
              </CardTitle>
              <div className="text-xs font-medium text-fg/40">
                Deleted records
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <MobileCardList
                items={uniqueDeleteLogs}
                getKey={(log: any) => log.id}
                title={(log: any) => new Date(log.deletedAt).toLocaleString()}
                badge={(log: any) => (
                  <span className="bg-fg/[0.04] text-neg px-2 py-0.5 rounded text-xs font-medium border border-fg/[0.08]">
                    {log.tableName}
                  </span>
                )}
                fields={(log: any) => [
                  { label: 'By whom', full: true, value: <WorkerStamp user={log.user} /> },
                  ...(log.reason ? [{ label: 'Reason', full: true, value: <span className="text-fg/60">"{log.reason}"</span> }] : []),
                  {
                    label: 'Data summary',
                    full: true,
                    value: <span className="text-xs text-fg/40 font-mono break-all">{log.deletedDataCsv.split('\n')[1]?.slice(0, 50)}...</span>,
                  },
                ]}
                actions={(log: any) => (
                  <>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-fg/5 hover:bg-fg/10 text-fg/70 hover:text-fg border border-fg/10 transition-colors text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                    <button
                      onClick={() => handleRestore(log.id)}
                      disabled={isRestoring(`audit:${log.id}`)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-fg/5 hover:bg-fg/10 text-fg/70 hover:text-fg border border-fg/10 transition-colors text-xs font-medium disabled:opacity-50"
                    >
                      {isRestoring(`audit:${log.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      {isRestoring(`audit:${log.id}`) ? 'Restoring...' : 'Restore'}
                    </button>
                  </>
                )}
                empty="No deletion logs found."
              />
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-fg/5">
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Deleted at</th>
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">By whom</th>
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Entity & reason</th>
                      <th className="px-6 py-3 text-xs font-medium text-fg/50">Data summary</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-fg/50">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fg/5">
                    {uniqueDeleteLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-fg/5 transition-colors group">
                        <td className="px-6 py-4 text-fg/90 font-medium text-xs">
                          {new Date(log.deletedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <WorkerStamp user={log.user} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-fg/[0.04] text-neg px-2 py-0.5 rounded text-xs font-medium border border-fg/[0.08] mb-1 inline-block">
                            {log.tableName}
                          </span>
                          {log.reason && (
                            <p className="text-xs text-fg/60 font-medium truncate max-w-[150px]" title={log.reason}>
                              "{log.reason}"
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-fg/40 font-mono truncate max-w-[200px]" title={log.deletedDataCsv}>
                              {log.deletedDataCsv.split('\n')[1]?.slice(0, 50)}...
                            </p>
                            <button aria-label="View details" 
                              onClick={() => setSelectedLog(log)}
                              className="text-fg/40 hover:text-fg transition-colors" 
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRestore(log.id)}
                            disabled={isRestoring(`audit:${log.id}`)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fg/5 hover:bg-fg/10 text-fg/70 hover:text-fg border border-fg/10 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {isRestoring(`audit:${log.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                            {isRestoring(`audit:${log.id}`) ? 'Restoring...' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {uniqueDeleteLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-fg/60 text-sm">
                          No deletion logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Recovery Tab — soft-deleted records (isDeleted: true) */
          <Card className="bg-fg/5 border-fg/10 overflow-hidden">
            <CardHeader className="border-b border-fg/5 flex flex-row items-center justify-between">
              <CardTitle className="text-fg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-fg-3" />
                Soft-deleted records
              </CardTitle>
              <div className="text-xs font-medium text-fg/40">
                {trashCount} record{trashCount !== 1 ? 's' : ''} recoverable
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {!trashItems || trashCount === 0 ? (
                <p className="text-center text-fg/60 text-sm py-16">All records are active — nothing in the recovery queue.</p>
              ) : (
                <>
                  {/* Batches */}
                  {trashItems.batches?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg mb-2">Batches ({trashItems.batches.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.batches.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{b.batchName}</p>
                              <p className="text-xs text-fg/40">{getBreedDisplayName(b.breedType)} · {b.currentCount} birds</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreBatch, b.id, 'Batch')} disabled={isRestoring(`Batch:${b.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.04] hover:bg-fg/[0.04] text-fg border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Batch:${b.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Batch:${b.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Expenses */}
                  {trashItems.expenses?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg-2 mb-2">Expenses ({trashItems.expenses.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.expenses.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{e.description || e.category}</p>
                              <p className="text-xs text-fg/40">{e.category} · GHS {e.amount.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreExpense, e.id, 'Expense')} disabled={isRestoring(`Expense:${e.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2 border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Expense:${e.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Expense:${e.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Sales */}
                  {trashItems.sales?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg-2 mb-2">Sales ({trashItems.sales.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.sales.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{s.customerName || 'Walk-in'}</p>
                              <p className="text-xs text-fg/40">GHS {s.totalAmount.toFixed(2)} · {s.status}</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreSale, s.id, 'Sale')} disabled={isRestoring(`Sale:${s.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2 border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Sale:${s.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Sale:${s.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Orders */}
                  {trashItems.orders?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg-2 mb-2">Orders ({trashItems.orders.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.orders.map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{o.customer?.name || 'No customer'}</p>
                              <p className="text-xs text-fg/40">GHS {o.totalAmount.toFixed(2)} · {o.status}</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreOrder, o.id, 'Order')} disabled={isRestoring(`Order:${o.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2 border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Order:${o.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Order:${o.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Inventory */}
                  {trashItems.inventory?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg-2 mb-2">Inventory ({trashItems.inventory.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.inventory.map((i: any) => (
                          <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{i.itemName}</p>
                              <p className="text-xs text-fg/40">{i.stockLevel} {i.unit} · {i.category}</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreInventory, i.id, 'Inventory')} disabled={isRestoring(`Inventory:${i.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.06] hover:bg-fg/[0.06] text-fg-2 border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Inventory:${i.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Inventory:${i.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Egg Production */}
                  {trashItems.eggProduction?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg mb-2">Egg Logs ({trashItems.eggProduction.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.eggProduction.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{e.batch?.batchName || 'Recovered egg log'}</p>
                              <p className="text-xs text-fg/40">{e.eggsCollected} collected · {new Date(e.logDate).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreEggProduction, e.id, 'Egg Log')} disabled={isRestoring(`Egg Log:${e.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.04] hover:bg-fg/[0.04] text-fg border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Egg Log:${e.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Egg Log:${e.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Feed Logs */}
                  {trashItems.feedingLogs?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg mb-2">Feed Logs ({trashItems.feedingLogs.length})</p>
                      <div className="space-y-1.5">
                        {trashItems.feedingLogs.map((l: any) => (
                          <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-fg/5 border border-fg/10">
                            <div>
                              <p className="text-xs font-medium text-fg">{l.batch?.batchName || 'Recovered feed log'}</p>
                              <p className="text-xs text-fg/40">{l.amountConsumed} kg · {new Date(l.logDate).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => handleSoftRestore(restoreFeedingLog, l.id, 'Feed Log')} disabled={isRestoring(`Feed Log:${l.id}`)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-fg/[0.04] hover:bg-fg/[0.04] text-fg border border-fg/[0.08] transition-colors flex items-center gap-1 disabled:opacity-50">
                              {isRestoring(`Feed Log:${l.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} {isRestoring(`Feed Log:${l.id}`) ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>


      <Dialog 
        isOpen={!!selectedLog} 
        onOpenChange={(open) => !open && setSelectedLog(null)}
        title="Deleted record details"
        description={selectedLog ? `Entity: ${selectedLog.tableName} | Deleted: ${new Date(selectedLog.deletedAt).toLocaleString()}` : ''}
      >
        {selectedLog && (
          <div className="bg-fg/[0.04] border border-fg/10 p-4 rounded-md overflow-x-auto mt-4 custom-scrollbar">
            <table className="w-full text-left text-xs text-fg/90">
              <tbody>
                {selectedLog.deletedDataCsv.split('\n')[0].split('|').map((header: string, i: number) => {
                  const cleanHeader = header.trim().replace(/^"|"$/g, '').replace(/_/g, ' ').toUpperCase();
                  const value = selectedLog.deletedDataCsv.split('\n')[1]?.split('|')[i]?.trim().replace(/^'|'$/g, '').replace(/''/g, "'") || 'N/A';
                  return (
                    <tr key={i} className="border-b border-fg/5 last:border-0 hover:bg-fg/5 transition-colors">
                      <td className="py-2 px-3 font-medium text-fg/50">{cleanHeader}</td>
                      <td className="py-2 px-3 font-mono break-all">{value === 'NULL' || value === '' ? <span className="text-fg/60">none</span> : value}</td>
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
                disabled={isRestoring(`audit:${selectedLog.id}`)}
                className="bg-fg hover:bg-fg/90 text-page px-6 py-2 rounded-md font-medium text-xs transition-colors disabled:opacity-50"
              >
                {isRestoring(`audit:${selectedLog.id}`) ? 'Restoring...' : 'Restore Record'}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
