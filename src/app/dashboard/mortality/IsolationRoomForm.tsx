'use client'

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { createIsolationRoom } from '@/lib/actions/dashboard-actions';
import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MutationBoundary } from '@/components/ui/MutationFeedback';
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
      setError('Capacity must be zero or more');
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
        setError(result.error || 'Could not create the isolation room');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong, try again');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={bare ? '' : `${g.tile} h-fit p-4`}>
      {!bare && <h3 className={`mb-4 text-sm font-medium ${g.text}`}>New room</h3>}
      <form onSubmit={handleSubmit}>
        <MutationBoundary active={isLoading} label="Creating isolation room...">
          <fieldset disabled={isLoading} className="space-y-4 disabled:opacity-70">
            <div>
              <label htmlFor="isolation-room-name" className={g.label}>Name</label>
              <Input
                id="isolation-room-name"
                name="name"
                placeholder="Infirmary A"
                required
                disabled={isLoading}
                className={g.input}
              />
            </div>
            <div>
              <label htmlFor="isolation-room-capacity" className={g.label}>Capacity in birds</label>
              <Input
                id="isolation-room-capacity"
                name="capacity"
                type="number"
                placeholder="50"
                required
                value={capacity}
                disabled={isLoading}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 0) {
                    setCapacity(val);
                  }
                }}
                className={g.input}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-neg-solid">
                {error}
              </p>
            )}
            <button type="submit" disabled={isLoading} aria-busy={isLoading || undefined} className={`${g.buttonPrimary} w-full`}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              )}
              {isLoading ? 'Adding room' : 'Add room'}
            </button>
          </fieldset>
        </MutationBoundary>
      </form>
    </div>
  );
};
