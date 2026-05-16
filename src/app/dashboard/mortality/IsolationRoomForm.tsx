'use client'

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const IsolationRoomForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const capacity = parseInt(formData.get('capacity') as string);

    try {
      const result = await createIsolationRoom({ name, capacity });
      if (result.success) {
        // Reset form
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        setError(result.error || 'Failed to create isolation room');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-5 bg-[#1F2937] rounded-xl border border-gray-700 h-fit">
      <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4" /> Create New Room
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          name="name" 
          label="Room Name" 
          placeholder="e.g. Infirmary A" 
          required 
          className="bg-[#374151] border-gray-600 text-white placeholder-gray-400" 
        />
        <Input 
          name="capacity" 
          type="number" 
          label="Capacity (Birds)" 
          placeholder="e.g. 50" 
          required 
          className="bg-[#374151] border-gray-600 text-white placeholder-gray-400" 
        />
        {error && (
          <p className="text-xs font-bold text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
            {error}
          </p>
        )}
        <Button 
          type="submit" 
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          isLoading={isLoading}
        >
          Add Room
        </Button>
      </form>
    </div>
  );
};
