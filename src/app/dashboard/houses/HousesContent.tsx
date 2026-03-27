'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Home, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createHouse } from '@/lib/actions/dashboard-actions';
import { useRouter } from 'next/navigation';

export default function HousesPage({ houses }: { houses: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createHouse(formData);
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">House Management</h2>
          <p className="text-gray-500 mt-1">Configure and manage your poultry houses.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-2 h-4 w-4" />
          {isAdding ? 'Cancel' : 'Add New House'}
        </Button>
      </div>

      {isAdding && (
        <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle>Register New House</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="House Name / Number" name="name" placeholder="e.g. House 1" required />
                <Input label="Capacity" name="capacity" type="number" placeholder="Max birds" required />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" isLoading={isLoading}>Save House</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {houses.map((house) => (
          <Card key={house.id} className="group hover:border-emerald-500 transition-all border-dashed">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-500" />
                {house.name}
              </CardTitle>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit2 className="w-3 h-3" /></button>
                <button className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-3 h-3" /></button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Capacity</span>
                  <span className="font-bold text-gray-900">{house.capacity.toLocaleString()} birds</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className="text-emerald-500 font-black uppercase text-[10px] tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Operational</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {houses.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
            <p className="text-gray-400 font-medium">No houses configured yet. Add your first house to manage flocks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
