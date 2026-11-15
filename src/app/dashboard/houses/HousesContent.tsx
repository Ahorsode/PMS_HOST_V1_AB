'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Home, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button, Dialog, Form, FormActions, Input } from '@/components/ui/form';
import { createHouse } from '@/lib/actions/dashboard-actions';
import { updateHouse, deleteHouse } from '@/lib/actions/house-actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MutationBoundary } from '@/components/ui/MutationFeedback';
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';

export default function HousesPage({ houses, canEdit = true, openAddOnLoad = false }: { houses: any[], canEdit?: boolean, openAddOnLoad?: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingHouse, setEditingHouse] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingHouseId, setDeletingHouseId] = useState<string | null>(null);
  const router = useRouter();

  const openedInitialAdd = useRef(false);
  useEffect(() => {
    if (!openAddOnLoad || !canEdit || openedInitialAdd.current) return;
    openedInitialAdd.current = true;
    setIsAdding(true);
  }, [openAddOnLoad, canEdit]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createHouse(formData);
      setIsAdding(false);
      toast.success("House added");
      router.refresh();
    } catch (error) {
      toast.error("The house could not be added. Try again.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingHouse) return;
    if (isSaving) return;
    
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const capacity = parseInt(formData.get('capacity') as string);
    
    try {
      const res = await updateHouse(editingHouse.id, { name, capacity });
      if (res.success) {
        toast.success("House updated");
        setEditingHouse(null);
        router.refresh();
      } else {
        toast.error(res.error || "The house could not be updated. Try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingHouseId === id) return;
    if (!confirm("Are you sure you want to delete this house? This cannot be undone.")) return;
    
    setDeletingHouseId(id);
    try {
      const res = await deleteHouse(id);
      if (res.success) {
        toast.success("House deleted successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete house");
      }
    } catch (error) {
      toast.error("An error occurred during deletion");
    } finally {
      setDeletingHouseId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 px-0 md:px-3 pt-2 pb-7 md:py-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-5 rounded-md shadow-sm border border-fg/[0.08] gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-fg">Houses</h1>
          <p className="mt-2 text-sm text-fg-2">The houses your flocks live in</p>
        </div>
        {canEdit && (
          <Button variant="accent" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" />
            Add house
          </Button>
        )}
      </div>

      <Dialog
        isOpen={isAdding}
        onOpenChange={(open) => !isSaving && setIsAdding(open)}
        title="Add a house"
        description="A place on your farm where a flock lives."
      >
        <Form onSubmit={handleSubmit}>
          <Input label="House name" name="name" placeholder="e.g. House 1" required />
          <Input
            label="How many it holds"
            name="capacity"
            type="number"
            min="0"
            unit="birds"
            placeholder="e.g. 2000"
            required
          />
          <FormActions>
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={isSaving} loadingText="Saving">
              Add house
            </Button>
          </FormActions>
        </Form>
      </Dialog>

      <Dialog
        isOpen={Boolean(editingHouse)}
        onOpenChange={(open) => !open && !isSaving && setEditingHouse(null)}
        title="Edit house"
        description={editingHouse?.name}
      >
        {editingHouse ? (
          <Form key={editingHouse.id} onSubmit={handleUpdate}>
            <Input label="House name" name="name" defaultValue={editingHouse.name} required />
            <Input
              label="How many it holds"
              name="capacity"
              type="number"
              min="0"
              unit="birds"
              defaultValue={editingHouse.capacity}
              required
            />
            <FormActions>
              <Button type="button" variant="outline" onClick={() => setEditingHouse(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" isLoading={isSaving} loadingText="Saving">
                Save changes
              </Button>
            </FormActions>
          </Form>
        ) : null}
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {houses.map((house) => (
          <MutationBoundary key={house.id} active={deletingHouseId === house.id} label="Deleting house...">
          <Card className="group hover:border-fg/[0.12] transition-colors border-dashed bg-card shadow-sm hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-fg">
                <Home className="w-4 h-4 text-fg-3" />
                {house.name}
              </CardTitle>
              {canEdit && (
                <div className="flex items-center gap-2 transition-opacity">
                  <button aria-label="Edit house" 
                    onClick={() => setEditingHouse(house)}
                    disabled={deletingHouseId === house.id}
                    className={quickButtonClass('edit')}
                    title="Edit house"
                  >
                    <Edit2 {...QUICK_ICON} />
                  </button>
                  <button 
                    onClick={() => handleDelete(house.id)}
                    disabled={deletingHouseId === house.id}
                    className={quickButtonClass('delete')}
                    title="Delete house"
                    aria-label="Delete house"
                  >
                    {deletingHouseId === house.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 {...QUICK_ICON} />}
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-3 font-medium">Capacity</span>
                  <span className="font-medium text-fg">{(house.capacity || 0).toLocaleString()} livestock</span>
                </div>
              </div>
            </CardContent>
          </Card>
          </MutationBoundary>
        ))}
        
        {houses.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-fg/[0.08] rounded-lg">
            <p className="text-fg-3 font-medium">No houses yet. Add your first house so you can keep flocks in it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
