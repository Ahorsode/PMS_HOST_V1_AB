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
import { toast } from 'sonner'

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
  const [ingredients, setIngredients] = useState<{ inventoryId: number; percentage: number | '' }[]>([])

  const addIngredient = () => {
    if (inventoryItems.length === 0) {
      alert("Inventory is empty. Please add raw materials to your inventory before creating a formulation.");
      return;
    }
    setIngredients([...ingredients, { inventoryId: inventoryItems[0]?.id || 0, percentage: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...ingredients]
    if (field === 'percentage') {
      const item = inventoryItems.find(i => i.id === newIngredients[index].inventoryId)
      if (item && value !== '' && Number(value) > Number(item.stockLevel)) {
        toast.error(`Cannot exceed stock level of ${item.stockLevel} bags`)
        value = Number(item.stockLevel)
      }
    }
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  const totalBags = ingredients.reduce((sum, i) => sum + Number(i.percentage || 0), 0)

  const getAvailableInventoryItems = (currentIndex: number) => {
    const selectedIds = ingredients.map((ing, idx) => idx !== currentIndex ? ing.inventoryId : null).filter(Boolean)
    return inventoryItems.filter(item => !selectedIds.includes(item.id))
  }

  const handleSubmit = async () => {
    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }
    
    if (ingredients.some(i => i.percentage === '' || Number(i.percentage) <= 0)) {
      toast.error('All ingredients must have a valid number of bags');
      return;
    }

    const res = await createFeedFormulation({
      name,
      type,
      targetLivestock,
      ingredients: ingredients.map(i => ({
        ...i,
        percentage: Number(i.percentage)
      }))
    })

    if (res.success) {
      toast.success('Formulation saved successfully');
      onSuccess()
    } else {
      toast.error((res as any).error || 'Failed to save formulation');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-white/20 bg-white/10 backdrop-blur-md shadow-2xl rounded-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-600/20 to-teal-500/10 border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-emerald-950 font-bold italic">
          <Beaker className="w-5 h-5" />
          Create New Formulation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">Formulation Name</div>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Broiler Power Starter"
              className="bg-white/80 border-white/30 backdrop-blur-sm text-emerald-950 font-bold"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">Feed Type</div>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as FeedType)}
              className="w-full h-10 px-2 rounded-md bg-white/80 border border-white/30 backdrop-blur-sm text-emerald-950 font-bold"
            >
              {FEED_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold flex items-center gap-2 text-white italic">
              <Scale className="w-5 h-5 text-emerald-600" />
              Ingredients Breakdown
            </div>
            <Button onClick={addIngredient} size="sm" variant="outline" className="gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 font-bold uppercase tracking-widest text-[10px]">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2 items-end bg-white/40 p-3 rounded-md border border-white/20">
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">Ingredient Source</div>
                  <select
                    value={ing.inventoryId}
                    onChange={(e) => updateIngredient(idx, 'inventoryId', Number(e.target.value))}
                    className="w-full h-10 px-2 rounded-md bg-white/90 border border-white/40 text-emerald-950 font-bold text-sm"
                  >
                    {getAvailableInventoryItems(idx).map(item => (
                      <option key={item.id} value={item.id}>{item.itemName}</option>
                    ))}
                  </select>
                </div>
                <div className="w-40 space-y-1">
                   <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest flex justify-between">
                     <span>Number of Bags</span>
                     <span className="text-gray-400">/ {inventoryItems.find(i => i.id === ing.inventoryId)?.stockLevel || 0}</span>
                   </div>
                  <Input 
                    type="number"
                    min="0"
                    max={inventoryItems.find(i => i.id === ing.inventoryId)?.stockLevel || 0}
                    value={ing.percentage}
                    onChange={(e) => updateIngredient(idx, 'percentage', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-white/90 text-emerald-950 font-bold"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeIngredient(idx)}
                  className="text-red-500 hover:bg-red-50 mb-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {ingredients.length === 0 && (
              <div className="text-center py-10 bg-white/20 rounded-md border-2 border-dashed border-white/20 text-emerald-900/40 font-bold uppercase tracking-widest text-xs italic">
                No ingredients added yet
              </div>
            )}
          </div>

          <div className="p-4 rounded-md flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-white uppercase tracking-widest text-xs italic">Total Number of Bags:</span>
            </div>
            <span className="text-2xl font-bold text-emerald-400 italic">
              {totalBags.toLocaleString()}
            </span>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-lg transition-all uppercase tracking-widest"
        >
          Save Formulation
        </Button>
      </CardContent>
    </Card>
    </div>
  )
}
