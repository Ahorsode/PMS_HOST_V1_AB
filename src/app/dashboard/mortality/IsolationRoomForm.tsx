'use client'

import React, { useState } from 'react';
import { createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Form, FormActions, FormError, Input } from '@/components/ui/form';
import { g } from '@/components/ui/graphite';

/** `bare` drops the tile chrome (for use inside a pop-up); `onCreated` runs after a save. */
export const IsolationRoomForm = ({ bare = false, onCreated }: { bare?: boolean; onCreated?: () => void } = {}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const capacityVal = parseInt(capacity);

    if (isNaN(capacityVal) || capacityVal < 0) {
      setError('Enter how many birds the room can hold. It cannot be less than zero.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await createIsolationRoom({ name, capacity: capacityVal });
      if (result.success) {
        // Reset form
        (e.target as HTMLFormElement).reset();
        setCapacity('');
        router.refresh();
        onCreated?.();
      } else {
        setError(result.error || 'The room could not be added. Try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={bare ? '' : `${g.tile} h-fit p-4`}>
      {!bare && <h3 className="mb-4 text-base font-semibold text-fg">New room</h3>}
      <Form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="isolation-room-name"
          name="name"
          label="Room name"
          placeholder="e.g. Sick bay A"
          required
          disabled={isLoading}
        />
        <Input
          id="isolation-room-capacity"
          name="capacity"
          type="number"
          label="How many birds it holds"
          unit="birds"
          placeholder="e.g. 50"
          required
          value={capacity}
          disabled={isLoading}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || parseInt(val) >= 0) {
              setCapacity(val);
            }
          }}
        />
        <FormError>{error}</FormError>
        <FormActions>
          <Button type="submit" variant="accent" isLoading={isLoading} loadingText="Adding room">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add room
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};
