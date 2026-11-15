'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Trash2, Pencil, Egg, Wheat, FlaskConical,
  AlertTriangle, ShoppingBag, TrendingDown, CheckCircle2, Syringe, History, Archive
} from 'lucide-react';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from '@/lib/actions/inventory-actions';
import { getInventoryPageData, type InventoryPageData } from '@/lib/actions/inventory-page-actions';
import {
  Button,
  Dialog,
  Form,
  FormActions,
  FormRow,
  FormSection,
  FormSummary,
  FormSummaryRow,
  Input,
  Segmented,
  Select,
} from '@/components/ui/form';
import { PartnerForm } from '@/components/partners/PartnerForm';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { SkeletonLine } from '@/components/ui/MutationFeedback';
import { MobileCardList } from '@/components/ui/MobileCardList';
import { useMoney } from '@/components/providers/CurrencyProvider'
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';


/* ───────────────────── helpers ───────────────────── */
function eggDisplay(stockLevel: number, eggsPerCrate = 30) {
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  const crates = Math.floor(stockLevel / epc);
  const remainder = stockLevel % epc;
  return { crates, remainder };
}

const BAG_OPTIONS = [
  { label: '¼ Bag', value: 0.25 },
  { label: '½ Bag', value: 0.5 },
  { label: '¾ Bag', value: 0.75 },
  { label: '1 Bag', value: 1 },
];

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  EGGS:      { icon: Egg,           color: 'border-fg/[0.08]',  label: 'Eggs'        },
  FEED:      { icon: Wheat,         color: 'border-fg/[0.08]', label: 'Feed'      },
  MEDICINE:  { icon: FlaskConical,  color: 'border-fg/[0.08]',       label: 'Medicine'  },
  VACCINE:   { icon: Syringe,       color: 'border-fg/[0.08]',   label: 'Vaccine'   },
  OTHER:     { icon: Package,       color: 'border-fg/10',                 label: 'Other'     },
};

type InventoryItem = {
  id: string;
  itemName: string;
  stockLevel: number;
  unit: string;
  category: string;
  costPerUnit?: number | null;
  usageType?: string | null;
  supplierId?: string | null;
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
  usageType: string;
};

// Health stock can declare how it is consumed.
const HEALTH_CATEGORIES = ['MEDICINE', 'VACCINE'];


/* ───────────────────── main component ───────────────────── */
export default function InventoryView({
  canEdit = true,
  openAddOnLoad = false,
  initialData,
  eggsPerCrate = 30,
}: {
  canEdit?: boolean
  openAddOnLoad?: boolean
  initialData: InventoryPageData
  eggsPerCrate?: number
}) {
  const money = useMoney()
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>(initialData.items);
  const [eggStock, setEggStock] = useState<{ totalEggs: number; batches: Array<{ batchId: string; batchName: string; eggsRemaining: number }> }>(
    initialData.activeEggStock ?? { totalEggs: 0, batches: [] }
  );
  const [loading, setLoading] = useState(false);
  const [showUsedUp, setShowUsedUp] = useState(false);
  const [usedUpCount, setUsedUpCount] = useState(initialData.usedUpCount);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>(initialData.suppliers);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>({
    itemName: '', stockLevel: '', unit: 'bags', category: 'FEED', costPerUnit: '', supplierId: '', paymentPlan: 'full', amountPaid: '', usageType: 'QUANTITY'
  });


  const fetchItems = useCallback(async (filterMode: 'active' | 'used_up') => {
    setLoading(true);
    const data = await getInventoryPageData(filterMode);
    setItems((data.items as InventoryItem[]).map(i => ({ ...i, stockLevel: Number(i.stockLevel) })));
    setUsedUpCount(data.usedUpCount);
    setEggStock(data.activeEggStock ?? { totalEggs: 0, batches: [] });
    setSuppliers(data.suppliers);
    setLoading(false);
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchItems(showUsedUp ? 'used_up' : 'active');
  }, [showUsedUp, fetchItems]);

  const refreshList = () => fetchItems(showUsedUp ? 'used_up' : 'active');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    if (!canEdit) return;
    setEditing(null);
    setForm({ itemName: '', stockLevel: '', unit: 'bags', category: 'FEED', costPerUnit: '', supplierId: '', paymentPlan: 'full', amountPaid: '', usageType: 'QUANTITY' });
    setShowForm(true);
  };

  const openedInitialAdd = useRef(false);
  useEffect(() => {
    if (!openAddOnLoad || !canEdit || openedInitialAdd.current) return;
    openedInitialAdd.current = true;
    openAdd();
  }, [openAddOnLoad, canEdit]);

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
      amountPaid: '',
      usageType: item.usageType || 'QUANTITY'
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!canEdit) return;
    if (isPending) return;
    if (!form.itemName.trim()) return showToast('Enter a name for the item', false);
    let stockNum = parseFloat(form.stockLevel);
    if (isNaN(stockNum) || stockNum < 0) return showToast('Enter how much is in stock', false);
    if (HEALTH_CATEGORIES.includes(form.category) && form.usageType === 'ONE_TIME') {
      stockNum = 1;
    }

    startTransition(async () => {
      let res: any;
      if (editing) {
        res = await updateInventoryItem(editing.id, {
          itemName: form.itemName,
          stockLevel: stockNum,
          unit: form.unit,
          category: form.category,
          ...(form.costPerUnit ? { costPerUnit: parseFloat(form.costPerUnit) } : {}),
          ...(form.supplierId && form.supplierId !== 'onetime' ? { supplierId: form.supplierId } : { supplierId: undefined }),
          ...(HEALTH_CATEGORIES.includes(form.category) ? { usageType: form.usageType } : {}),
        });
      } else {
        res = await createInventoryItem({
          itemName: form.itemName,
          stockLevel: stockNum,
          unit: form.unit,
          category: form.category,
          ...(form.costPerUnit ? { costPerUnit: parseFloat(form.costPerUnit) } : {}),
          ...(form.supplierId && form.supplierId !== 'onetime' ? { supplierId: form.supplierId } : { supplierId: undefined }),
          ...(HEALTH_CATEGORIES.includes(form.category) ? { usageType: form.usageType } : {}),
          paymentPlan: form.paymentPlan,
          ...(form.paymentPlan === 'installments' && form.amountPaid ? { amountPaid: parseFloat(form.amountPaid) } : {}),
        });
      }
      if (res?.success) {
        showToast(editing ? 'Item updated' : 'Item added to stock');
        setShowForm(false);
        refreshList();
      } else {
        showToast(res?.error || 'The item could not be saved. Try again.', false);
      }
    });
  };

  const confirmDelete = (item: InventoryItem) => {
    if (!canEdit) return;
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDelete = (reason: string) => {
    if (!canEdit || !itemToDelete) return;
    if (isPending) return;
    startTransition(async () => {
      const res = await deleteInventoryItem(itemToDelete.id, reason);
      if (res?.success) { showToast('Item removed'); refreshList(); setShowDeleteModal(false); }
      else showToast(res?.error || 'Delete failed', false);
    });
  };

  const handleAddNewSupplier = () => {
    setShowSupplierModal(true);
  };


  // separate eggs from everything else
  const otherItems = items.filter(i => String(i.category || '').toUpperCase() !== 'EGGS');
  const mutatingItemId = isPending ? itemToDelete?.id ?? editing?.id ?? null : null;

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
          <h1 className="text-3xl font-semibold leading-tight text-fg">Inventory</h1>
          <p className="mt-2 text-sm text-fg-2">Feed, medicine and egg stock</p>
        </div>
        {canEdit && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-fg hover:bg-fg/90 text-page font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add item
          </motion.button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowUsedUp(false)}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            !showUsedUp
              ? 'bg-accent font-semibold text-accent-fg shadow-sm'
              : 'bg-fg/10 text-fg/70 hover:bg-fg/15 hover:text-fg'
          }`}
        >
          <Package className="h-4 w-4" />
          In stock
        </button>
        <button
          type="button"
          onClick={() => setShowUsedUp(true)}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            showUsedUp
              ? 'bg-accent font-semibold text-accent-fg shadow-sm'
              : 'bg-fg/10 text-fg/70 hover:bg-fg/15 hover:text-fg'
          }`}
        >
          <Archive className="h-4 w-4" />
          Used up
          {usedUpCount > 0 ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${showUsedUp ? 'bg-fg/[0.08] text-fg' : 'bg-fg/[0.04] text-yolk'}`}>
              {usedUpCount}
            </span>
          ) : null}
        </button>
        {showUsedUp ? (
          <p className="text-xs font-medium text-fg/45">
            Fully depleted items — click a row to see who used them and when.
          </p>
        ) : null}
      </div>

      {/* ── Egg Inventory Card ── */}
      {!showUsedUp && eggStock.totalEggs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-tile border-fg/[0.08] p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md bg-fg/[0.04] flex items-center justify-center shadow-inner">
                <Egg className="w-8 h-8 text-fg-3" />
              </div>
              <div>
                <p className="text-fg/80 text-sm font-medium mb-1">Egg inventory (active batches)</p>
                <p className="text-5xl font-medium text-fg leading-tight">
                  {eggDisplay(eggStock.totalEggs, eggsPerCrate).crates}
                  <span className="text-2xl font-medium text-fg/80 ml-1">crates</span>
                </p>
                {eggDisplay(eggStock.totalEggs, eggsPerCrate).remainder > 0 && (
                  <p className="text-fg text-base font-medium mt-1">
                    + {eggDisplay(eggStock.totalEggs, eggsPerCrate).remainder} eggs remaining
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-fg/80 text-sm font-medium mb-1">Raw count</p>
              <p className="text-3xl font-medium text-fg">{eggStock.totalEggs.toLocaleString()}</p>
              <p className="text-fg/80 text-sm font-medium">eggs from active layer batches</p>
            </div>
          </div>
          {eggStock.batches.length > 0 && (
            <div className="rounded-md border border-fg/[0.08] bg-fg/[0.04] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fg/10">
                    <th className="text-left px-4 py-2 text-fg/70 font-semibold text-xs">Batch</th>
                    <th className="text-right px-4 py-2 text-fg/70 font-semibold text-xs">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {eggStock.batches.map((batch) => {
                    const display = eggDisplay(batch.eggsRemaining, eggsPerCrate);
                    return (
                    <tr key={batch.batchId} className="border-b border-fg/5 last:border-0">
                      <td className="px-4 py-2 font-medium text-fg">{batch.batchName}</td>
                      <td className="px-4 py-2 text-right font-medium text-fg">
                        {display.crates} {display.crates === 1 ? 'crate' : 'crates'}
                        {display.remainder > 0 ? ` / ${display.remainder} eggs` : ''}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total SKUs', value: items.length, icon: Package, color: 'text-fg' },
          { label: 'Feed items', value: (grouped['FEED'] || []).length, icon: Wheat, color: 'text-fg' },
          { label: 'Medicine', value: (grouped['MEDICINE'] || []).length, icon: FlaskConical, color: 'text-fg-2' },
          { label: 'Vaccine', value: (grouped['VACCINE'] || []).length, icon: Syringe, color: 'text-fg' },
          { label: 'Other', value: (grouped['OTHER'] || []).length, icon: ShoppingBag, color: 'text-fg-2' },
        ].map(card => (
          <div key={card.label} className="glass-pill rounded-md p-3 flex items-center gap-2">
            <card.icon className={`w-5 h-5 ${card.color}`} />
            <div>
              <p className="text-3xl font-medium text-fg leading-none">{card.value}</p>
              <p className="text-fg/80 text-sm font-medium mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category Tables ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-fg/70 text-sm animate-pulse">
          Loading {showUsedUp ? 'used-up' : 'active'} inventory…
        </div>
      ) : otherItems.length === 0 && (showUsedUp || eggStock.totalEggs === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          {showUsedUp ? <Archive className="w-12 h-12 text-fg/10" /> : <Package className="w-12 h-12 text-fg/10" />}
          <p className="text-fg/70 text-sm">
            {showUsedUp
              ? 'No used-up items yet.'
              : 'No inventory items in stock. Add your first item above.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => {
          const meta = CATEGORY_META[cat] || CATEGORY_META['OTHER'];
          return (
            <div key={cat} className="space-y-2">
              <p className="text-sm font-medium text-fg ml-1">{meta.label}</p>
              <MobileCardList
                className={`rounded-lg border bg-tile ${meta.color}`}
                items={catItems}
                getKey={(item) => item.id}
                onItemClick={(item) => router.push(`/dashboard/inventory/${item.id}`)}
                cardClassName={(item) => (mutatingItemId === item.id ? 'bg-fg/[0.04] animate-pulse' : undefined)}
                title={(item) => (
                  <span className="flex items-center gap-2">
                    {item.itemName}
                    <History className="h-3.5 w-3.5 text-fg/25" aria-hidden />
                  </span>
                )}
                badge={(item) => (
                  <span className={`font-medium text-lg ${showUsedUp ? 'text-neg' : item.stockLevel <= 5 ? 'text-neg' : 'text-accent'}`}>
                    {showUsedUp ? (
                      <span className="text-sm font-medium">Used up</span>
                    ) : item.unit === 'bags' ? (
                      <span>{item.stockLevel} <span className="text-fg/60 font-medium text-sm">bags</span></span>
                    ) : (
                      item.stockLevel.toLocaleString()
                    )}
                    {!showUsedUp && item.stockLevel <= 5 && <TrendingDown className="inline w-4 h-4 ml-2" />}
                  </span>
                )}
                fields={(item) => [
                  {
                    label: 'Cost/unit',
                    value: item.costPerUnit != null
                      ? <span className="text-fg font-medium">{money.format(Number(item.costPerUnit))}</span>
                      : <span className="text-fg/60">—</span>,
                  },
                  { label: 'Unit', value: item.unit },
                ]}
                actions={(item) => (
                  <>
                    <WorkerStamp user={item.user} />
                    {canEdit && !showUsedUp && (
                      <>
                        <button type="button" onClick={() => openEdit(item)} aria-label="Edit item" title="Edit" className={quickButtonClass('edit')}>
                          <Pencil {...QUICK_ICON} />
                        </button>
                        <button type="button" onClick={() => confirmDelete(item)} aria-label="Delete item" title="Delete" className={quickButtonClass('delete')}>
                          <Trash2 {...QUICK_ICON} />
                        </button>
                      </>
                    )}
                  </>
                )}
              />
              <div className={`hidden md:block rounded-lg border bg-tile ${meta.color} overflow-hidden`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-fg/10">
                        <th className="text-left px-4 py-3 text-fg/80 font-semibold text-sm">Item</th>
                        <th className="text-right px-4 py-3 text-fg/80 font-semibold text-sm">Stock</th>
                        <th className="text-right px-4 py-3 text-fg/80 font-semibold text-sm">Cost/unit</th>
                        <th className="text-right px-4 py-3 text-fg/80 font-semibold text-sm">Unit</th>
                        <th className="px-4 py-2" />
                      </tr>

                  </thead>
                  <tbody>
                    {catItems.map((item, idx) => {
                      const isMutatingItem = mutatingItemId === item.id;

                      return (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/dashboard/inventory/${item.id}`)}
                        className={`${idx < catItems.length - 1 ? 'border-b border-fg/5' : ''} hover:bg-fg/5 transition-colors cursor-pointer ${isMutatingItem ? 'bg-fg/[0.04] animate-pulse' : ''}`}
                      >
                        <td className="px-4 py-2 font-medium text-fg">
                          <div className="flex items-center gap-2">
                            {isMutatingItem ? <SkeletonLine className="h-4 w-32" /> : item.itemName}
                            {!isMutatingItem ? (
                              <History className="h-3.5 w-3.5 text-fg/25" aria-hidden />
                            ) : null}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium text-lg ${showUsedUp ? 'text-neg' : item.stockLevel <= 5 ? 'text-neg' : 'text-accent'}`}>
                          {isMutatingItem ? (
                            <SkeletonLine className="ml-auto h-4 w-16" />
                          ) : showUsedUp ? (
                            <span className="text-sm font-medium">Used up</span>
                          ) : item.unit === 'bags' ? (
                            <span>{item.stockLevel} <span className="text-fg/60 font-medium text-sm">bags</span></span>
                          ) : (
                            item.stockLevel.toLocaleString()
                          )}
                          {!showUsedUp && item.stockLevel <= 5 && <TrendingDown className="inline w-4 h-4 ml-2" />}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isMutatingItem ? (
                            <SkeletonLine className="ml-auto h-4 w-20" />
                          ) : item.costPerUnit != null ? (
                            <span className="text-fg font-medium text-base">{money.format(Number(item.costPerUnit))}</span>
                          ) : <span className="text-fg/60">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-fg/70">
                          {isMutatingItem ? <SkeletonLine className="ml-auto h-3 w-12" /> : item.unit}
                        </td>
                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                           <WorkerStamp user={item.user} />
                           {canEdit && !showUsedUp && (
                             <>
                               <button type="button" aria-label="Edit item" title="Edit" onClick={() => openEdit(item)} className={quickButtonClass('edit')}>
                                 <Pencil {...QUICK_ICON} />
                               </button>
                               <button type="button" aria-label="Delete item" title="Delete" onClick={() => confirmDelete(item)} className={quickButtonClass('delete')}>
                                 <Trash2 {...QUICK_ICON} />
                               </button>
                             </>
                           )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* ── Add / Edit Modal ── */}
      <Dialog
        isOpen={showForm}
        onOpenChange={(open) => !isPending && setShowForm(open)}
        title={editing ? 'Edit item' : 'Add to stock'}
        className="max-w-lg"
      >
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
          noValidate
        >
          <FormSection title="What is it">
            <Segmented
              label="Type of item"
              value={form.category}
              onChange={(cat: string) => setForm(p => ({
                ...p,
                category: cat,
                unit: cat === 'FEED' ? 'bags' : cat === 'VACCINE' ? 'doses' : 'units',
              }))}
              options={[
                { value: 'FEED', label: 'Feed' },
                { value: 'MEDICINE', label: 'Medicine' },
                { value: 'VACCINE', label: 'Vaccine' },
                { value: 'OTHER', label: 'Other' },
              ]}
              wrap
            />

            <Input
              label="Item name"
              required
              value={form.itemName}
              onChange={e => setForm(p => ({ ...p, itemName: e.target.value }))}
              placeholder="e.g. Layer mash, Tylosin 50"
            />

            {/* Usage — only for health stock (vaccines/medicines) */}
            {HEALTH_CATEGORIES.includes(form.category) && (
              <Segmented
                label="How is it used"
                value={form.usageType}
                onChange={(usageType: string) =>
                  setForm(p => (usageType === 'ONE_TIME' ? { ...p, usageType: 'ONE_TIME', stockLevel: '1' } : { ...p, usageType: 'QUANTITY' }))
                }
                options={[
                  { value: 'ONE_TIME', label: 'Used once' },
                  { value: 'QUANTITY', label: 'Measured amount' },
                ]}
                hint={
                  form.usageType === 'ONE_TIME'
                    ? 'Stock stays at 1 and is used up when it is marked done on a flock.'
                    : 'Stock goes down by the amount used each time.'
                }
              />
            )}
          </FormSection>

          <FormSection title="How much">
            {/* Stock level — bag fractions for FEED */}
            {form.category === 'FEED' ? (
              <div className="space-y-2">
                <Input
                  label="Bags in stock"
                  type="number"
                  step="0.25"
                  min="0"
                  unit="bags"
                  value={form.stockLevel}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setForm(p => ({ ...p, stockLevel: val }));
                    }
                  }}
                  placeholder="0"
                />
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Add to the bags in stock">
                  {BAG_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, stockLevel: String((parseFloat(p.stockLevel || '0') + opt.value).toFixed(2)) }))}
                      className="min-h-11 rounded-lg border border-fg/[0.14] bg-page px-1 text-sm font-medium text-fg-2 transition-colors duration-150 hover:border-fg/25 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      + {opt.label.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <FormRow alwaysInline>
                <Input
                  label="In stock"
                  type="number"
                  min="0"
                  value={form.stockLevel}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setForm(p => ({ ...p, stockLevel: val }));
                    }
                  }}
                  placeholder="0"
                />
                {/* Unit (non-FEED) */}
                <Input
                  label="Counted in"
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="e.g. vials"
                />
              </FormRow>
            )}
          </FormSection>

          <FormSection title="Cost">
            <Input
              label={`Cost for one ${form.category === 'FEED' ? 'bag' : (form.unit || 'unit').replace(/s$/, '')}`}
              optional
              type="number"
              step="0.01"
              min="0"
              unit={money.currency}
              value={form.costPerUnit}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) {
                  setForm(p => ({ ...p, costPerUnit: val }));
                }
              }}
              placeholder="0.00"
            />
            {Number(form.costPerUnit) > 0 && Number(form.stockLevel) > 0 ? (
              <FormSummary>
                <FormSummaryRow
                  label="Value of this stock"
                  value={money.format(Number(form.costPerUnit) * Number(form.stockLevel))}
                  strong
                />
              </FormSummary>
            ) : null}
          </FormSection>

          {/* Supplier & Payment */}
          <FormSection title="Supplier and payment">
            <Select
              label="Supplier"
              optional
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
            >
              <option value="">No supplier chosen</option>
              <option value="onetime">One-time supplier</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
              <option value="add_new">+ Add a new supplier</option>
            </Select>

            <Segmented
              label="How was it paid for"
              value={form.paymentPlan}
              onChange={(paymentPlan: string) => setForm(p => ({ ...p, paymentPlan }))}
              disabled={form.supplierId === 'onetime'}
              options={[
                { value: 'full', label: 'Paid in full' },
                { value: 'installments', label: 'Part paid' },
                { value: 'none', label: 'Not paid' },
              ]}
              hint={form.supplierId === 'onetime' ? 'A one-time supplier is always paid in full.' : undefined}
            />

            {form.paymentPlan === 'installments' && (
              <Input
                label="Paid so far"
                type="number"
                step="0.01"
                min="0"
                unit={money.currency}
                value={form.amountPaid}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || Number(val) >= 0) {
                    setForm(p => ({ ...p, amountPaid: val }));
                  }
                }}
                placeholder="0.00"
              />
            )}
          </FormSection>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={isPending} loadingText="Saving">
              {editing ? 'Save changes' : 'Add to stock'}
            </Button>
          </FormActions>
        </Form>
      </Dialog>

      {/* ── Add Supplier Modal ── */}
      <Dialog
        isOpen={showSupplierModal}
        onOpenChange={setShowSupplierModal}
        title="Add a supplier"
      >
        <PartnerForm 
          setIsOpen={setShowSupplierModal} 
          defaultType="supplier"
          onSuccess={(supplier) => {
            setSuppliers(prev => [...prev, supplier]);
            setForm(p => ({ ...p, supplierId: String(supplier.id) }));
          }}
        />
      </Dialog>

      {/* ── Toast ── */}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[110] flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm 
              ${toast.ok ? 'bg-accent font-semibold text-accent-fg shadow-sm' : 'bg-red-500/90 text-fg'}`}
          >
            {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.itemName}
        isLoading={isPending}
      />
    </div>
  );
}
