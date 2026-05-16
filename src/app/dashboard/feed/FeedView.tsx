'use client'

import { useState, useEffect } from 'react'
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
import { getAllFeedFormulations, getConsumptionEfficiency } from '@/lib/actions/feed-actions'
import { getAllInventory } from '@/lib/actions/inventory-actions'
import { getAllBatches } from '@/lib/actions/dashboard-actions'

export default function FeedDashboard({ canEdit = true }: { canEdit?: boolean }) {
  const [formulations, setFormulations] = useState<any[]>([])
  const [efficiency, setEfficiency] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [selectedFormulation, setSelectedFormulation] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [fRes, eRes, iRes, bRes] = await Promise.all([
      getAllFeedFormulations(),
      getConsumptionEfficiency(),
      getAllInventory(),
      getAllBatches()
    ])
    setFormulations(fRes)
    setEfficiency(eRes)
    setInventory(iRes)
    setBatches(bRes)
    setLoading(false)
  }

  return (
    <div className="p-5 space-y-7 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-normal">Feed Management</h1>
          <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs mt-2">Formulation builder & consumption efficiency analytics</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => { setSelectedFormulation(undefined); setShowLogForm(true); }} 
              className="bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-100 gap-2 shadow-lg"
            >
              <Utensils className="w-4 h-4" />
              Log Feeding
            </Button>
            <Button 
              onClick={() => setShowForm(!showForm)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/50"
            >
              {showForm ? <Package className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'View Formulations' : 'Create Formulation'}
            </Button>
          </div>
        )}
      </header>

      {showLogForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="glass-pill rounded-lg p-5 w-full max-w-md border border-white/10 bg-[#0f172a]">
            <h2 className="text-xl font-bold text-white mb-4">Log Feeding</h2>
            <FeedForm
              batches={batches}
              inventory={inventory.filter(i => i.category === 'FEED' || !i.category)}
              formulations={formulations}
              selectedFormulationId={selectedFormulation}
              mode="create"
              onClose={() => { setShowLogForm(false); setSelectedFormulation(undefined); loadData(); }}
            />
          </div>
        </div>
      )}

      {showForm ? (
        <FeedFormulationForm 
          inventoryItems={inventory} 
          onSuccess={() => {
            setShowForm(false)
            loadData()
          }} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Efficiency Report */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="border-none bg-emerald-950 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-7 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={120} />
              </div>
              <CardHeader>
                <CardTitle className="text-emerald-100 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Consumption Efficiency (FCR)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {efficiency.length > 0 ? efficiency.map((eff) => (
                    <div key={eff.id} className="bg-white/10 backdrop-blur-md p-3 rounded-md border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-emerald-300">{eff.name}</span>
                        <span className="text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded text-emerald-200 uppercase tracking-widest">
                          Active
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{eff.fcr}</span>
                        <span className="text-xs font-bold text-emerald-400">FCR</span>
                      </div>
                      <div className="mt-3 flex justify-between text-sm font-bold text-emerald-100 uppercase tracking-wider">
                        <span>Feed: {eff.totalFeed} bags</span>
                        <span>Weight: {eff.currentWeight}kg</span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 p-7 text-center text-emerald-300/40 border-2 border-dashed border-emerald-800 rounded-lg">
                      No efficiency data available. Log weights and feedings.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <Card className="bg-[#1a2332] border-white/10 shadow-xl rounded-lg h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-500/20 rounded-md text-amber-400">
                        <Database className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-white text-lg border-none">Active Formulations</h3>
                    </div>
                    <div className="space-y-2">
                      {formulations.slice(0, 3).map(f => (
                        <div key={f.id} className="flex justify-between items-center p-2 hover:bg-white/5 rounded-md transition-colors group border border-transparent hover:border-white/10">
                          <div>
                            <p className="font-bold text-emerald-100 text-base">{f.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white/60 uppercase tracking-wider">{f.type}</p>
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold border border-emerald-500/20">
                                {Number(f.stockLevel || 0).toLocaleString()} bags left
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSelectedFormulation(f.id); setShowLogForm(true); }}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 px-2 py-1 h-auto text-xs"
                          >
                            LOG FEED
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
               </Card>

               <Card className="bg-[#1a2332] border-white/10 shadow-xl rounded-lg h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-500/20 rounded-md text-emerald-400">
                        <Beaker className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-white text-lg border-none">Inventory Check</h3>
                    </div>
                    <div className="space-y-2">
                       {inventory.slice(0, 4).map(item => (
                         <div key={item.id} className="flex justify-between items-center bg-white/5 p-2 rounded-md border border-white/10">
                           <span className="text-lg font-bold text-emerald-100">{item.itemName}</span>
                           <span className={`text-sm font-bold px-3 py-1.5 rounded-md border ${item.stockLevel < 100 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
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
             <Card className="bg-[#1a2332] border-white/10 shadow-xl rounded-lg h-full">
                <CardHeader>
                  <CardTitle className="text-white text-xl border-none">Ingredient Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {formulations.map(f => (
                     <div key={f.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm uppercase tracking-widest text-emerald-400">{f.name}</h4>
                        </div>
                        <div className="space-y-2">
                           {f.ingredients.map((ing: any) => (
                             <div key={ing.id} className="space-y-1">
                               <div className="flex justify-between text-sm font-bold text-white/70">
                                 <span>{ing.inventory.itemName}</span>
                                 <span className="text-emerald-400">{ing.percentage}%</span>
                               </div>
                               <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                 <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${ing.percentage}%` }}
                                 />
                               </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   ))}
                </CardContent>
             </Card>
          </div>
        </div>
      )}
    </div>
  )
}
