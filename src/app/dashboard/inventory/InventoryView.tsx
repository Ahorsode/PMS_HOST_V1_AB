'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Trash2, Pencil, Egg, Wheat, FlaskConical,
  X, Save, AlertTriangle, ShoppingBag, TrendingDown, CheckCircle2
} from 'lucide-react';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import {
  getAllInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from '@/lib/actions/inventory-actions';
import { getSuppliers, createSupplier } from '@/lib/actions/supplier-actions';

/* ───────────────────── helpers ───────────────────── */
function eggDisplay(stockLevel: number) {
  const crates = Math.floor(stockLevel / 30);
  const remainder = stockLevel % 30;
  return { crates, remainder };
}

const BAG_OPTIONS = [
  { label: '¼ Bag', value: 0.25 },
  { label: '½ Bag', value: 0.5 },
  { label: '¾ Bag', value: 0.75 },
  { label: '1 Bag', value: 1 },
];

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  EGGS:      { icon: Egg,           color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',  label: 'Eggs'        },
  FEED:      { icon: Wheat,         color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30', label: 'Feed'      },
  MEDICINE:  { icon: FlaskConical,  color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',       label: 'Medicine'  },
  OTHER:     { icon: Package,       color: 'from-white/10 to-white/5 border-white/10',                 label: 'Other'     },
};

type InventoryItem = {
  id: number;
  itemName: string;
  stockLevel: number;
  unit: string;
  category: string;
  costPerUnit?: number | null;
  supplierId?: number | null;
  user?: {
    firstname: string | null;
    surname: string | null;
    role: string;
  } | null;
};

type FormState = {
  itemName: string;
  stockLevel: string;
  unit: string;
  category: string;
  bagQty?: string;
  costPerUnit: string;
  supplierId: string;
  paymentPlan: string;
  amountPaid: string;
};


/* ───────────────────── main component ───────────────────── */
export default function InventoryView({ canEdit = true }: { canEdit?: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState<FormState>({
    itemName: '', stockLevel: '', unit: 'bags', category: 'FEED', costPerUnit: '', supplierId: '', paymentPlan: 'full', amountPaid: ''
  });

  const fetchItems = async () => {
    setLoading(true);
    const data = await getAllInventory();
    setItems((data as InventoryItem[]).map(i => ({ ...i, stockLevel: Number(i.stockLevel) })));
    const sups = await getSuppliers();
    setSuppliers(sups);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    if (!canEdit) return;
    setEditing(null);
    setForm({ itemName: '', stockLevel: '', unit: 'bags', category: 'FEED', costPerUnit: '', supplierId: '', paymentPlan: 'full', amountPaid: '' });
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    if (!canEdit) return;
    setEditing(item);
    setForm({
      itemName: item.itemName,
      stockLevel: String(item.stockLevel),
      unit: item.unit,
      category: item.category,
      costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : '',
      supplierId: item.supplierId ? String(item.supplierId) : '',
      paymentPlan: 'full',
      amountPaid: ''
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!canEdit) return;
    if (!form.itemName.trim()) return showToast('Item name is required', false);
    const stockNum = parseFloat(form.stockLevel);
    if (isNaN(stockNum) || stockNum < 0) return showToast('Invalid stock level', false);

    startTransition(async () => {
      let res: any;
      if (editing) {
        res = await updateInventoryItem(editing.id, {
          itemName: form.itemName,
          stockLevel: stockNum,
          unit: form.unit,
          category: form.category,
          ...(form.costPerUnit ? { costPerUnit: parseFloat(form.costPerUnit) } : {}),
          ...(form.supplierId && form.supplierId !== 'onetime' ? { supplierId: parseInt(form.supplierId) } : { supplierId: undefined }),
        });
      } else {
        res = await createInventoryItem({
          itemName: form.itemName,
          stockLevel: stockNum,
          unit: form.unit,
          category: form.category,
          ...(form.costPerUnit ? { costPerUnit: parseFloat(form.costPerUnit) } : {}),
          ...(form.supplierId && form.supplierId !== 'onetime' ? { supplierId: parseInt(form.supplierId) } : {}),
          paymentPlan: form.paymentPlan,
          ...(form.paymentPlan === 'installments' && form.amountPaid ? { amountPaid: parseFloat(form.amountPaid) } : {}),
        });
      }
      if (res?.success) {
        showToast(editing ? 'Item updated!' : 'Item added!');
        setShowForm(false);
        fetchItems();
      } else {
        showToast(res?.error || 'Something went wrong', false);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await deleteInventoryItem(id);
      if (res?.success) { showToast('Item removed'); fetchItems(); }
      else showToast(res?.error || 'Delete failed', false);
    });
  };

  const handleAddNewSupplier = async () => {
    const name = window.prompt("Enter new supplier name:");
    if (!name || !name.trim()) return;
    const debt = window.prompt("Initial amount owing/debt (optional):", "0");
    const legacyDebt = debt ? parseFloat(debt) : 0;

    startTransition(async () => {
      const res = await createSupplier({ 
        name: name.trim(),
        legacyDebt: isNaN(legacyDebt) ? 0 : legacyDebt
      });
      if (res.success && res.supplier) {
        showToast('Supplier added!');
        setSuppliers(prev => [...prev, res.supplier]);
        setForm(p => ({ ...p, supplierId: String(res.supplier.id) }));
      } else {
        showToast(res.error || 'Failed to add supplier', false);
      }
    });
  };

  // separate eggs from everything else
  const eggItem = items.find(i => i.category === 'EGGS' && i.itemName === 'Eggs');
  const otherItems = items.filter(i => !(i.category === 'EGGS' && i.itemName === 'Eggs'));

  const grouped: Record<string, InventoryItem[]> = {};
  otherItems.forEach(item => {
    const cat = item.category || 'OTHER';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Inventory <span className="text-emerald-400">Hub</span>
          </h1>
          <p className="text-white/80 mt-1 text-base font-medium">Feed, medicine &amp; egg stock — all in one place</p>
        </div>
        {canEdit && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" /> Add Item
          </motion.button>
        )}
      </div>

      {/* ── Egg Inventory Card ── */}
      {eggItem && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/30 p-5 flex flex-col sm:flex-row items-center justify-between gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-md bg-amber-500/20 flex items-center justify-center shadow-inner">
              <Egg className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <p className="text-white/80 text-sm uppercase tracking-widest font-black mb-1">Egg Inventory</p>
              <p className="text-5xl font-black text-white leading-tight">
                {eggDisplay(eggItem.stockLevel).crates}
                <span className="text-2xl font-bold text-white/80 ml-1">crates</span>
              </p>
              {eggDisplay(eggItem.stockLevel).remainder > 0 && (
                <p className="text-amber-400 text-base font-bold mt-1">
                  + {eggDisplay(eggItem.stockLevel).remainder} remainder
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm font-bold mb-1">Raw count</p>
            <p className="text-3xl font-black text-white">{eggItem.stockLevel.toLocaleString()}</p>
            <p className="text-white/80 text-sm font-bold">eggs in stock</p>
          </div>
        </motion.div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total SKUs', value: items.length, icon: Package, color: 'text-white' },
          { label: 'Feed Items', value: (grouped['FEED'] || []).length, icon: Wheat, color: 'text-emerald-400' },
          { label: 'Medicine', value: (grouped['MEDICINE'] || []).length, icon: FlaskConical, color: 'text-blue-400' },
          { label: 'Other', value: (grouped['OTHER'] || []).length, icon: ShoppingBag, color: 'text-purple-400' },
        ].map(card => (
          <div key={card.label} className="glass-pill rounded-md p-3 flex items-center gap-2">
            <card.icon className={`w-5 h-5 ${card.color}`} />
            <div>
              <p className="text-3xl font-black text-white leading-none">{card.value}</p>
              <p className="text-white/80 text-sm font-bold mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category Tables ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/70 text-sm animate-pulse">Loading inventory…</div>
      ) : otherItems.length === 0 && !eggItem ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Package className="w-12 h-12 text-white/10" />
          <p className="text-white/70 text-sm">No inventory items yet. Add your first item above.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => {
          const meta = CATEGORY_META[cat] || CATEGORY_META['OTHER'];
          return (
            <div key={cat} className="space-y-2">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400 ml-1">{meta.label}</p>
              <div className={`rounded-lg border bg-gradient-to-br ${meta.color} overflow-hidden`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                        <th className="text-left px-4 py-3 text-white/80 font-black text-sm uppercase tracking-wider">Item</th>
                        <th className="text-right px-4 py-3 text-white/80 font-black text-sm uppercase tracking-wider">Stock</th>
                        <th className="text-right px-4 py-3 text-white/80 font-black text-sm uppercase tracking-wider">Cost/Unit</th>
                        <th className="text-right px-4 py-3 text-white/80 font-black text-sm uppercase tracking-wider">Unit</th>
                        <th className="px-4 py-2" />
                      </tr>

                  </thead>
                  <tbody>
                    {catItems.map((item, idx) => (
                      <tr key={item.id} className={`${idx < catItems.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                        <td className="px-4 py-2 font-semibold text-white">{item.itemName}</td>
                        <td className={`px-4 py-3 text-right font-black text-lg ${item.stockLevel <= 5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                          {item.unit === 'bags' ? (
                            <span>{item.stockLevel} <span className="text-white/60 font-bold text-sm uppercase">bags</span></span>
                          ) : (
                            item.stockLevel.toLocaleString()
                          )}
                          {item.stockLevel <= 5 && <TrendingDown className="inline w-4 h-4 ml-2" />}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.costPerUnit != null ? (
                            <span className="text-amber-400 font-black text-base">GHS {Number(item.costPerUnit).toFixed(2)}</span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-white/70">{item.unit}</td>
                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                           <WorkerStamp user={item.user} />
                           {canEdit && (
                             <>
                               <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                                 <Pencil className="w-4 h-4" />
                               </button>
                               <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }}
              className="glass-pill rounded-lg p-5 w-full max-w-md space-y-4 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{editing ? 'Edit Item' : 'Add Inventory Item'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-md hover:bg-white/10 text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {['FEED', 'MEDICINE', 'OTHER'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setForm(p => ({ ...p, category: cat, unit: cat === 'FEED' ? 'bags' : 'units' }))}
                      className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${form.category === cat ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/10'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Item Name</label>
                <input
                  value={form.itemName}
                  onChange={e => setForm(p => ({ ...p, itemName: e.target.value }))}
                  placeholder="e.g. Layers Mash, Tylosin 50…"
                  className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Stock level — bag fractions for FEED */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  {form.category === 'FEED' ? 'Quantity (bags)' : 'Stock Level'}
                </label>
                {form.category === 'FEED' ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={form.stockLevel}
                      onChange={e => setForm(p => ({ ...p, stockLevel: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {BAG_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setForm(p => ({ ...p, stockLevel: String((parseFloat(p.stockLevel || '0') + opt.value).toFixed(2)) }))}
                          className="py-1.5 text-xs rounded-md bg-white/10 hover:bg-emerald-500/20 text-white/70 hover:text-emerald-400 font-semibold transition-all"
                        >
                          + {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={form.stockLevel}
                    onChange={e => setForm(p => ({ ...p, stockLevel: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                )}
              </div>

              {/* Unit (non-FEED) */}
              {form.category !== 'FEED' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Unit</label>
                  <input
                    value={form.unit}
                    onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    placeholder="e.g. vials, sachets, litres…"
                    className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              {/* Cost per unit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Cost Per Unit (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPerUnit}
                  onChange={e => setForm(p => ({ ...p, costPerUnit: e.target.value }))}
                  placeholder="0.00"
                  className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-amber-400 text-sm font-bold placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Supplier & Payment */}
              <div className="space-y-1.5">
                <label className="text-sm font-black text-white/80 uppercase tracking-widest">Supplier</label>
                <div className="flex gap-2">
                  <select
                    value={form.supplierId}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'add_new') {
                        handleAddNewSupplier();
                      } else {
                        setForm(p => ({ 
                          ...p, 
                          supplierId: val,
                          ...(val === 'onetime' ? { paymentPlan: 'full' } : {}) 
                        }));
                      }
                    }}
                    className="flex-1 bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-emerald-500/50 [&>option]:bg-gray-800"
                  >
                    <option value="">-- Select Supplier --</option>
                    <option value="onetime">One-Time Supplier</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                    <option value="add_new">+ Add New Supply</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, supplierId: 'onetime', paymentPlan: 'full' }))}
                    className="px-3 py-2 rounded-md bg-white/10 hover:bg-emerald-500/30 text-white/80 hover:text-white text-xs font-black transition-all whitespace-nowrap uppercase tracking-tighter"
                  >
                    Set One-Time
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-black text-white/80 uppercase tracking-widest">Payment Plan</label>
                <select
                  value={form.paymentPlan}
                  onChange={e => setForm(p => ({ ...p, paymentPlan: e.target.value }))}
                  disabled={form.supplierId === 'onetime'}
                  className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 [&>option]:bg-gray-800 disabled:opacity-50"
                >
                  <option value="full">Paid in Full</option>
                  <option value="installments">Installments</option>
                  <option value="none">None</option>
                </select>
              </div>

              {form.paymentPlan === 'installments' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Amount Paid (Initial Payment)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amountPaid}
                    onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-white/10 border border-white/10 rounded-md px-3 py-2.5 text-emerald-400 text-sm font-bold placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={isPending}
                className="w-full py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isPending ? 'Saving…' : editing ? 'Update Item' : 'Add to Inventory'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 right-6 z-[99] flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm shadow-xl
              ${toast.ok ? 'bg-emerald-500 text-black' : 'bg-red-500/90 text-white'}`}
          >
            {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
