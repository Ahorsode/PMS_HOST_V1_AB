'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  TrendingUp, 
  Package, 
  Beaker, 
  Plus, 
  ArrowRight,
  Database,
  Utensils
} from 'lucide-react'
import { FeedFormulationForm } from './FeedFormulationForm'
import { FeedForm } from './FeedForm'
import { FeedingHistoryPanel } from './FeedingHistoryPanel'
import { Dialog } from '@/components/ui/Dialog'
import type { FeedPageData } from '@/lib/actions/feed-page-actions'
import { getFeedPageData, refreshFeedDynamicData } from '@/lib/actions/feed-page-actions'
import { getReorderThreshold, isFeedCategory, isLowStock } from '@/lib/inventory/feed-categories'

export default function FeedDashboard({
  canEdit = true,
  openLogOnLoad = false,
  initialData,
}: {
  canEdit?: boolean
  openLogOnLoad?: boolean
  initialData: FeedPageData
}) {
  const [formulations, setFormulations] = useState<any[]>(initialData.formulations)
  const [efficiency, setEfficiency] = useState<any[]>(initialData.efficiency)
  const [inventory, setInventory] = useState<any[]>(initialData.inventory)
  const [batches, setBatches] = useState<any[]>(
    initialData.batches.filter((batch: any) => batch.status === 'active')
  )
  const [showForm, setShowForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [selectedFormulation, setSelectedFormulation] = useState<string | undefined>(undefined)
  const [feedingLogs, setFeedingLogs] = useState<any[]>(initialData.feedingLogs)
  const [refreshing, setRefreshing] = useState(false)
  const openedInitialLog = useRef(false)

  useEffect(() => {
    if (!openLogOnLoad || !canEdit || openedInitialLog.current) return
    openedInitialLog.current = true
    setSelectedFormulation(undefined)
    setShowLogForm(true)
  }, [canEdit, openLogOnLoad])

  const refreshAfterLog = async () => {
    setRefreshing(true)
    try {
      const { feedingLogs: newLogs, inventory: newInventory, efficiency: newEfficiency } = await refreshFeedDynamicData()
      setFeedingLogs(newLogs)
      setInventory(newInventory)
      setEfficiency(newEfficiency)
    } finally {
      setRefreshing(false)
    }
  }

  const handleOptimisticFeedLog = (batchId: string, amount: number) => {
    setEfficiency((prev) =>
      prev.map((eff) =>
        eff.id === batchId
          ? { ...eff, totalFeed: (Number(eff.totalFeed) || 0) + amount }
          : eff
      )
    )
  }

  const handleOptimisticFeedRollback = (batchId: string, amount: number) => {
    setEfficiency((prev) =>
      prev.map((eff) =>
        eff.id === batchId
          ? { ...eff, totalFeed: Math.max(0, (Number(eff.totalFeed) || 0) - amount) }
          : eff
      )
    )
  }

  const refreshAfterFormulation = async () => {
    const data = await getFeedPageData()
    setFormulations(data.formulations)
    setInventory(data.inventory)
  }

  const feedInventory = inventory.filter((item) => isFeedCategory(item.category))

  return (
    <div className="px-0 pt-2 pb-7 md:p-5 space-y-7 animate-in fade-in duration-200">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Feed</h1>
          <p className="mt-2 text-sm text-[#a1a1a6]">Feed formulations, stock and daily feeding</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => { setSelectedFormulation(undefined); setShowLogForm(true); }} 
              className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.04] text-[#ededed] gap-2"
            >
              <Utensils className="w-4 h-4" />
              Log feeding
            </Button>
            <Button 
              onClick={() => setShowForm(!showForm)} 
              className="bg-[#ededed] hover:bg-white text-[#141415] gap-2"
            >
              {showForm ? <Package className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'View formulations' : 'Create formulation'}
            </Button>
          </div>
        )}
      </header>

      <Dialog
        isOpen={showLogForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowLogForm(false)
            setSelectedFormulation(undefined)
          }
        }}
        title="Log feeding"
      >
        <FeedForm
          batches={batches}
          inventory={feedInventory}
          formulations={formulations}
          selectedFormulationId={selectedFormulation}
          mode="create"
          onClose={() => { setShowLogForm(false); setSelectedFormulation(undefined); }}
          onSaved={refreshAfterLog}
          onOptimisticLog={handleOptimisticFeedLog}
          onOptimisticRollback={handleOptimisticFeedRollback}
        />
      </Dialog>

      {showForm ? (
        <FeedFormulationForm 
          inventoryItems={inventory.filter(i => {
            const name = (i.itemName || '').toLowerCase();
            const cat = (i.category || '').toUpperCase();
            return cat === 'FEED'
              && !name.includes('egg')
              && !cat.includes('EGG')
              && !i.eggCategoryId;
          })} 
          onSuccess={() => {
            setShowForm(false)
            refreshAfterFormulation()
          }} 
          onClose={() => setShowForm(false)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Efficiency Report */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Feed conversion (FCR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {efficiency.length > 0 ? efficiency.map((eff) => (
                    <div key={eff.id} className="bg-white/10 p-3 rounded-md border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-[#ededed]">{eff.name}</span>
                        <span className="text-xs font-medium bg-white/[0.04] px-2 py-1 rounded text-[#ededed]">
                          Active
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-medium">{eff.fcr}</span>
                        <span className="text-xs font-medium text-[#ededed]">FCR</span>
                      </div>
                      <div className="mt-3 flex justify-between text-sm font-medium text-[#ededed]">
                        <span>Feed: {eff.totalFeed} bags</span>
                        <span>Weight: {eff.currentWeight}kg</span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 p-7 text-center text-[#ededed] border-2 border-dashed border-emerald-800 rounded-lg">
                      No efficiency data available. Log weights and feedings.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <Card className="bg-[#19191b] border-white/10 rounded-lg h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white/[0.04] rounded-md text-[#ededed]">
                        <Database className="w-6 h-6" />
                      </div>
                      <h3 className="font-medium text-white text-lg border-none">Active formulations</h3>
                    </div>
                    <div className="space-y-2">
                      {formulations.slice(0, 3).map(f => (
                        <div key={f.id} className="flex justify-between items-center p-2 hover:bg-white/5 rounded-md transition-colors group border border-transparent hover:border-white/10">
                          <div>
                            <p className="font-medium text-[#ededed] text-base">{f.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-[#a1a1a6]">{String(f.type || '').charAt(0) + String(f.type || '').slice(1).toLowerCase()}</p>
                              <span className="text-xs bg-white/[0.04] text-[#ededed] px-2 py-0.5 rounded font-medium border border-white/[0.08]">
                                {Number(f.stockLevel || 0).toLocaleString()} bags left
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSelectedFormulation(f.id); setShowLogForm(true); }}
                            className="text-[#ededed] hover:text-[#ededed] hover:bg-white/[0.04] px-2 py-1 h-auto text-xs"
                          >
                            Log feed
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
               </Card>

               <Card className="bg-[#19191b] border-white/10 rounded-lg h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white/[0.04] rounded-md text-[#ededed]">
                        <Beaker className="w-6 h-6" />
                      </div>
                      <h3 className="font-medium text-white text-lg border-none">Inventory check</h3>
                    </div>
                    <div className="space-y-2">
                       {feedInventory.slice(0, 4).map(item => (
                         <div key={item.id} className="flex justify-between items-center bg-white/5 p-2 rounded-md border border-white/10">
                           <span className="text-lg font-medium text-[#ededed]">{item.itemName}</span>
                           <span className={`text-sm font-medium px-3 py-1.5 rounded-md border ${isLowStock(item) ? 'bg-white/[0.04] border-white/[0.08] text-[#f2777b]' : 'bg-white/[0.04] border-white/[0.08] text-emerald-400'}`}>
                              {Number(item.stockLevel).toLocaleString()} {item.unit}
                           </span>
                         </div>
                       ))}
                    </div>
                  </CardContent>
               </Card>
            </div>
          </div>

          {/* Right Pillar: Recent History */}
          <div>
             <Card className="bg-[#19191b] border-white/10 rounded-lg h-full">
                <CardHeader>
                  <CardTitle className="text-white text-xl border-none">Ingredient usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {formulations.map(f => (
                     <div key={f.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-sm text-[#ededed]">{f.name}</h4>
                        </div>
                        <div className="space-y-2">
                           {f.ingredients.map((ing: any) => {
                             const quantity = Number(ing.quantity || 0)
                             const total = f.ingredients.reduce(
                               (sum: number, item: any) => sum + Number(item.quantity || 0),
                               0,
                             ) || 1
                             const share = Math.min(100, (quantity / total) * 100)
                             return (
                             <div key={ing.id} className="space-y-1">
                               <div className="flex justify-between text-sm font-medium text-white/70">
                                 <span>{ing.inventory.itemName}</span>
                                 <span className="text-[#ededed]">{quantity} bags</span>
                               </div>
                               <div className="h-1.5 bg-[#232325] rounded-full overflow-hidden">
                                 <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${share}%` }}
                                 />
                               </div>
                             </div>
                           )})}
                        </div>
                     </div>
                   ))}
                </CardContent>
             </Card>
          </div>
        </div>
      )}

      {!showForm && (
        <FeedingHistoryPanel
          logs={feedingLogs}
          batches={batches}
          inventory={feedInventory}
          formulations={formulations}
          canEdit={canEdit}
          isRefreshing={refreshing}
        />
      )}
    </div>
  )
}
