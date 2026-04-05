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
  Database
} from 'lucide-react'
import { FeedFormulationForm } from './FeedFormulationForm'
import { getAllFeedFormulations, getConsumptionEfficiency } from '@/lib/actions/feed-actions'
import { getAllInventory } from '@/lib/actions/inventory-actions'

export default function FeedDashboard() {
  const [formulations, setFormulations] = useState<any[]>([])
  const [efficiency, setEfficiency] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [fRes, eRes, iRes] = await Promise.all([
      getAllFeedFormulations(),
      getConsumptionEfficiency(),
      getAllInventory()
    ])
    setFormulations(fRes)
    setEfficiency(eRes)
    setInventory(iRes)
    setLoading(false)
  }

  return (
    <div className="p-5 space-y-7 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-normal">Feed Management</h1>
          <p className="text-gray-500 font-medium">Formulation builder & consumption efficiency analytics</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-200"
        >
          {showForm ? <Package className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'View Formulations' : 'Create Formulation'}
        </Button>
      </header>

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
                      <div className="mt-3 flex justify-between text-xs font-medium text-emerald-200/60 uppercase">
                        <span>Feed: {eff.totalFeed}kg</span>
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
               <Card className="bg-white/50 border-white shadow-sm rounded-lg h-full border-2">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 rounded-md text-amber-600">
                        <Database className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-gray-900 border-none">Active Formulations</h3>
                    </div>
                    <div className="space-y-2">
                      {formulations.slice(0, 3).map(f => (
                        <div key={f.id} className="flex justify-between items-center p-2 hover:bg-white rounded-md transition-colors cursor-pointer group">
                          <div>
                            <p className="font-bold text-gray-800">{f.name}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-normal">{f.type}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
               </Card>

               <Card className="bg-white/50 border-white shadow-sm rounded-lg h-full border-2">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-100 rounded-md text-emerald-600">
                        <Beaker className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-gray-900 border-none">Inventory Check</h3>
                    </div>
                    <div className="space-y-2">
                       {inventory.slice(0, 4).map(item => (
                         <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-md border border-gray-100">
                           <span className="text-sm font-bold text-gray-700">{item.itemName}</span>
                           <span className={`text-xs font-bold px-2 py-1 rounded ${item.stockLevel < 100 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
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
             <Card className="bg-white/80 border-white shadow-xl rounded-lg h-full border-t border-l">
                <CardHeader>
                  <CardTitle className="text-gray-900 border-none">Ingredient Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   {formulations.map(f => (
                     <div key={f.id} className="p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm uppercase tracking-widest text-emerald-800">{f.name}</h4>
                        </div>
                        <div className="space-y-2">
                           {f.ingredients.map((ing: any) => (
                             <div key={ing.id} className="space-y-1">
                               <div className="flex justify-between text-xs font-bold text-gray-400">
                                 <span>{ing.inventory.itemName}</span>
                                 <span>{ing.percentage}%</span>
                               </div>
                               <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
