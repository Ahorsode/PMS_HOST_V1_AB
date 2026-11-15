'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import { createFeedFormulation } from '@/lib/actions/feed-actions'
import { FeedType, LivestockType } from '@prisma/client'
import { toast } from 'sonner'
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormSection,
  FormSummary,
  FormSummaryRow,
  Input,
  Select,
} from '@/components/ui/form'

const FEED_TYPES = [
  'PRE_STARTER',
  'STARTER',
  'GROWER',
  'FINISHER',
  'BREEDER',
  'CUSTOM'
] as const;

const FEED_TYPE_LABELS: Record<(typeof FEED_TYPES)[number], string> = {
  PRE_STARTER: 'Pre-starter',
  STARTER: 'Starter',
  GROWER: 'Grower',
  FINISHER: 'Finisher',
  BREEDER: 'Breeder',
  CUSTOM: 'Custom',
};

interface FeedFormulationFormProps {
  inventoryItems: any[]
  onSuccess: () => void
  onClose?: () => void
}

export function FeedFormulationForm({ inventoryItems, onSuccess, onClose }: FeedFormulationFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState<FeedType>('STARTER')
  const [targetLivestock] = useState<LivestockType>('POULTRY_BROILER')
  const [ingredients, setIngredients] = useState<{ inventoryId: string; bags: number | '' }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (inventoryItems.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-fg/[0.08] bg-card p-5">
        <div className="space-y-1.5 text-center">
          <p className="text-base font-semibold text-fg">No feed in stock yet</p>
          <p className="text-sm leading-6 text-fg-2">
            A feed mix is made from feed items in your stock. Add those first, then come back to mix them.
          </p>
        </div>
        <FormActions>
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="accent"
            onClick={() => {
              if (onClose) onClose();
              router.push('/dashboard/inventory');
            }}
          >
            Add feed stock
          </Button>
        </FormActions>
      </div>
    );
  }

  const addIngredient = () => {
    // Only allow adding if we haven't exhausted inventory items
    const usedIds = ingredients.map(i => i.inventoryId);
    const availableItems = inventoryItems.filter(item => !usedIds.includes(item.id));

    if (availableItems.length === 0) {
      toast.error("Every feed item in stock is already in this mix.");
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
        toast.error(`You only have ${item.stockLevel} bags in stock`)
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

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      toast.error('Give this feed mix a name');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    if (ingredients.some(i => i.bags === '' || Number(i.bags) <= 0)) {
      toast.error('Enter how many bags of each ingredient go into the mix');
      return;
    }

    const uniqueIds = new Set(ingredients.map(i => i.inventoryId));
    if (uniqueIds.size !== ingredients.length) {
      toast.error('Each ingredient can only be used once');
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
        toast.success('Feed mix saved');
        onSuccess()
      } else {
        toast.error((res as any).error || 'The feed mix could not be saved');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-fg/[0.08] bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-fg/[0.08] py-3 pl-5 pr-3">
        <h2 className="text-lg font-semibold leading-6 text-fg">New feed mix</h2>
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg-2 transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <Form onSubmit={handleSubmit} noValidate className="p-5">
        <FormSection title="About the mix">
          <FormRow>
            <Input
              label="Mix name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Broiler starter mix"
              required
            />
            <Select
              label="Feed stage"
              value={type}
              onChange={(e) => setType(e.target.value as FeedType)}
              options={FEED_TYPES.map((t) => ({ value: t, label: FEED_TYPE_LABELS[t] }))}
            />
          </FormRow>
        </FormSection>

        <FormSection title="Ingredients" hint="Pick feed items from your stock and how many bags of each go in.">
          {ingredients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-fg/[0.14] px-4 py-6 text-center text-sm text-fg-3">
              No ingredients yet
            </p>
          ) : (
            <ul className="space-y-3">
              {ingredients.map((ing, idx) => {
                const stock = inventoryItems.find(i => i.id === ing.inventoryId)?.stockLevel || 0;
                return (
                  <li key={idx} className="rounded-xl border border-fg/[0.08] bg-tile p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                      <Select
                        label={`Ingredient ${idx + 1}`}
                        wrapperClassName="col-span-2 sm:col-span-1"
                        value={ing.inventoryId}
                        onChange={(e) => updateIngredient(idx, 'inventoryId', e.target.value)}
                        options={getAvailableInventoryItems(idx).map((item) => ({ value: item.id, label: item.itemName }))}
                      />
                      <Input
                        label="Bags"
                        labelAside={`${stock} in stock`}
                        type="number"
                        min="0"
                        max={stock}
                        unit="bags"
                        value={ing.bags}
                        onChange={(e) => updateIngredient(idx, 'bags', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ingredient ${idx + 1}`}
                        onClick={() => removeIngredient(idx)}
                        disabled={isSubmitting}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neg/30 bg-neg/10 text-neg transition-colors duration-150 hover:bg-neg/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 md:h-11 md:w-11"
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={addIngredient}
            disabled={isSubmitting || ingredients.length >= inventoryItems.length}
            className="w-full"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add ingredient
          </Button>

          <FormSummary>
            <FormSummaryRow label="Total mix" value={`${totalBags.toLocaleString()} bags`} strong />
          </FormSummary>
        </FormSection>

        <FormActions>
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="accent" isLoading={isSubmitting} loadingText="Saving mix">
            Save feed mix
          </Button>
        </FormActions>
      </Form>
    </div>
  )
}
