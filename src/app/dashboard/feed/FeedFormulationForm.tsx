'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  Trash2, 
  Scale, 
  Beaker, 
  AlertCircle 
} from 'lucide-react'
import { createFeedFormulation } from '@/lib/actions/feed-actions'
import { FeedType, LivestockType } from '@prisma/client'

const FEED_TYPES = [
  'PRE_STARTER',
  'STARTER',
  'GROWER',
  'FINISHER',
  'BREEDER',
  'CUSTOM'
] as const;

const LIVESTOCK_TYPES = [
  'POULTRY_BROILER',
  'POULTRY_LAYER',
  'CATTLE',
  'SHEEP_GOAT',
  'PIG'
] as const;

interface FeedFormulationFormProps {
  inventoryItems: any[]
  onSuccess: () => void
}

export function FeedFormulationForm({ inventoryItems, onSuccess }: FeedFormulationFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<FeedType>('STARTER')
  const [targetLivestock, setTargetLivestock] = useState<LivestockType>('POULTRY_BROILER')
  const [ingredients, setIngredients] = useState<{ inventoryId: number; percentage: number }[]>([])

  const addIngredient = () => {
    setIngredients([...ingredients, { inventoryId: inventoryItems[0]?.id || 0, percentage: 0 }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  const totalPercentage = ingredients.reduce((sum, i) => sum + Number(i.percentage), 0)

  const handleSubmit = async () => {
    if (totalPercentage !== 100) {
      alert('Total percentage must be exactly 100%')
      return
    }

    const res = await createFeedFormulation({
      name,
      type,
      targetLivestock,
      ingredients
    })

    if (res.success) {
      onSuccess()
    }
  }

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-600/20 to-teal-500/10 border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-emerald-950">
          <Beaker className="w-5 h-5" />
          Create New Formulation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Formulation Name</div>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Broiler Power Starter"
              className="bg-white/50 border-white/30 backdrop-blur-sm"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Feed Type</div>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as FeedType)}
              className="w-full h-10 px-3 rounded-md bg-white/50 border border-white/30 backdrop-blur-sm"
            >
              {FEED_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              Ingredients Breakdown
            </div>
            <Button onClick={addIngredient} size="sm" variant="outline" className="gap-2 border-emerald-200 text-emerald-700 bg-emerald-50">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-3 items-end bg-white/30 p-4 rounded-xl border border-white/20">
                <div className="flex-1 space-y-1">
                  <div className="text-xs uppercase font-bold text-gray-500">Ingredient Source</div>
                  <select
                    value={ing.inventoryId}
                    onChange={(e) => updateIngredient(idx, 'inventoryId', Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md bg-white/80 border border-white/40"
                  >
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>{item.itemName}</option>
                    ))}
                  </select>
                </div>
                <div className="w-32 space-y-1">
                  <div className="text-xs uppercase font-bold text-gray-500">Ratio (%)</div>
                  <Input 
                    type="number"
                    value={ing.percentage}
                    onChange={(e) => updateIngredient(idx, 'percentage', Number(e.target.value))}
                    max={100}
                    className="bg-white/80"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeIngredient(idx)}
                  className="text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-xl flex justify-between items-center ${totalPercentage === 100 ? 'bg-emerald-100/50 border-emerald-200' : 'bg-amber-100/50 border-amber-200'} border transition-colors`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${totalPercentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="font-bold text-gray-800">Total Composition:</span>
            </div>
            <span className={`text-xl font-black ${totalPercentage === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {totalPercentage}%
            </span>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all"
          disabled={totalPercentage !== 100}
        >
          Save Formulation
        </Button>
      </CardContent>
    </Card>
  )
}
