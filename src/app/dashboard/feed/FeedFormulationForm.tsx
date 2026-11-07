'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  Trash2, 
  Scale, 
  Beaker, 
  AlertCircle,
  X
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
  onClose?: () => void
}

export function FeedFormulationForm({ inventoryItems, onSuccess, onClose }: FeedFormulationFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState<FeedType>('STARTER')
  const [targetLivestock, setTargetLivestock] = useState<LivestockType>('POULTRY_BROILER')
  const [ingredients, setIngredients] = useState<{ inventoryId: string; bags: number | '' }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (inventoryItems.length === 0) {
    return (
      <div className="space-y-4 p-6 text-center max-w-md mx-auto bg-fg/10 border border-fg/20 rounded-lg">
        <p className="text-fg font-medium text-lg">
          No Inventory Items Available!
        </p>
        <p className="text-fg/70 text-sm">
          To create a feed formulation, you must first add ingredient items to your inventory.
        </p>
        <div className="flex gap-2 pt-2">
          {onClose && (
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-fg/20 text-fg hover:bg-fg/10 font-medium bg-transparent"
            >
              Cancel
            </Button>
          )}
          <Button 
            onClick={() => {
              if (onClose) onClose();
              router.push('/dashboard/inventory');
            }}
            className="flex-1 bg-fg hover:bg-fg/90 text-page font-medium"
          >
            Go to inventory
          </Button>
        </div>
      </div>
    );
  }

  const addIngredient = () => {
    // Only allow adding if we haven't exhausted inventory items
    const usedIds = ingredients.map(i => i.inventoryId);
    const availableItems = inventoryItems.filter(item => !usedIds.includes(item.id));
    
    if (availableItems.length === 0) {
      toast.error("All inventory items have already been added to this formulation.");
      return;
    }
    
    setIngredients([...ingredients, { inventoryId: availableItems[0].id, bags: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...ingredients]
    if (field === 'bags') {
      const item = inventoryItems.find(i => i.id === newIngredients[index].inventoryId)
      if (item && value !== '' && Number(value) > Number(item.stockLevel)) {
        toast.error(`Cannot exceed stock level of ${item.stockLevel} bags`)
        value = Number(item.stockLevel)
      }
    }
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  const totalBags = ingredients.reduce((sum, i) => sum + Number(i.bags || 0), 0)

  const getAvailableInventoryItems = (currentIndex: number) => {
    // Collect all IDs selected in OTHER rows
    const otherSelectedIds = ingredients
      .filter((_, idx) => idx !== currentIndex)
      .map(ing => ing.inventoryId);
      
    // Return all items except those selected in other rows
    return inventoryItems.filter(item => !otherSelectedIds.includes(item.id));
  }

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!name.trim()) {
      toast.error('Please name this formulation');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }
    
    if (ingredients.some(i => i.bags === '' || Number(i.bags) <= 0)) {
      toast.error('All ingredients must have a valid number of bags');
      return;
    }

    const uniqueIds = new Set(ingredients.map(i => i.inventoryId));
    if (uniqueIds.size !== ingredients.length) {
      toast.error('Each ingredient can only be selected once');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createFeedFormulation({
        name: name.trim(),
        type,
        targetLivestock,
        ingredients: ingredients.map((ingredient) => ({
          inventoryId: ingredient.inventoryId,
          quantity: Number(ingredient.bags),
          bags: Number(ingredient.bags),
        })),
      })

      if (res.success) {
        toast.success('Formulation saved successfully');
        onSuccess()
      } else {
        toast.error((res as any).error || 'Failed to save formulation');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-fg/20 bg-fg/10 rounded-md overflow-hidden">
      <CardHeader className="bg-tile border-b border-fg/10 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-fg font-medium">
          <Beaker className="w-5 h-5 text-fg-3" />
          Create new formulation
        </CardTitle>
        {onClose && (
          <Button aria-label="Close"
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-fg/70 hover:text-fg hover:bg-fg/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm font-medium text-fg">Formulation name</div>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Broiler Power Starter"
              className="bg-fg/10 border-fg/10 text-fg placeholder:text-fg/50 focus:ring-fg/10 focus:border-fg/[0.08] font-medium h-12"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-fg">Feed type</div>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as FeedType)}
              className="w-full h-12 px-3 rounded-md bg-fg/10 border border-fg/10 text-fg focus:ring-fg/10 focus:border-fg/[0.08] font-medium [&>option]:bg-page [&>option]:text-fg"
            >
              {FEED_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-lg font-medium flex items-center gap-2 text-fg">
              <Scale className="w-5 h-5 text-emerald-600" />
              Ingredients breakdown
            </div>
            <Button 
              onClick={addIngredient} 
              size="sm" 
              variant="outline" 
              disabled={isSubmitting || ingredients.length >= inventoryItems.length}
              className="gap-2 border-fg/[0.08] text-fg bg-fg/[0.04] font-medium text-xs h-10 px-4 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add item
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-end gap-3 p-3 rounded-lg bg-fg/5 border border-fg/10">
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium text-fg ml-1">Ingredient source</div>
                  <select
                    value={ing.inventoryId}
                    onChange={(e) => updateIngredient(idx, 'inventoryId', e.target.value)}
                    className="w-full h-14 px-4 rounded-md bg-card border-2 border-fg/[0.08] text-accent-fg font-medium text-lg focus:border-fg/[0.12] transition-colors shadow-inner"
                  >
                    {getAvailableInventoryItems(idx).map(item => (
                      <option key={item.id} value={item.id}>{item.itemName}</option>
                    ))}
                  </select>
                </div>
                <div className="w-52 space-y-1">
                   <div className="text-sm font-medium text-fg flex justify-between px-1">
                     <span>Bags</span>
                     <span className="text-fg/50">Max: {inventoryItems.find(i => i.id === ing.inventoryId)?.stockLevel || 0}</span>
                   </div>
                  <Input 
                    type="number"
                    min="0"
                    max={inventoryItems.find(i => i.id === ing.inventoryId)?.stockLevel || 0}
                    value={ing.bags}
                    onChange={(e) => updateIngredient(idx, 'bags', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-card text-accent-fg font-medium h-14 text-xl border-2 border-fg/[0.08] shadow-inner"
                  />
                </div>
                <Button aria-label="Remove ingredient" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeIngredient(idx)}
                  disabled={isSubmitting}
                  className="text-neg hover:bg-fg/[0.04] h-14 w-14 border border-fg/[0.08]"
                >
                  <Trash2 className="w-6 h-6" />
                </Button>
              </div>
            ))}
            {ingredients.length === 0 && (
              <div className="text-center py-10 bg-fg/20 rounded-md border-2 border-dashed border-fg/20 text-emerald-900/40 font-medium text-xs">
                No ingredients added yet
              </div>
            )}
          </div>

          <div className="p-5 rounded-md flex justify-between items-center bg-fg/[0.04] border-2 border-fg/[0.08]">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-7 h-7 text-fg-3" />
              <span className="font-medium text-fg text-lg">Final batch size:</span>
            </div>
            <span className="text-5xl font-medium text-fg tabular-nums">
              {totalBags.toLocaleString()} <span className="text-xl text-fg/50 ml-1">bags</span>
            </span>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          isLoading={isSubmitting}
          loadingText="Saving formulation..."
          className="w-full h-12 bg-fg hover:bg-fg/90 text-page font-medium rounded-md transition-colors"
        >
          Save formulation
        </Button>
      </CardContent>
    </Card>
    </div>
  )
}
