'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { dataService } from '@/services/dataService';
import { Plus, Home, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export const IsolationRoomForm = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState('');

  // Use a more robust UUID generation fallback for all environments
  const generateId = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const capacityVal = parseInt(capacity);
    const userId = session?.user?.id || 'offline_user';
    const farmId = session?.user?.activeFarmId || 'farm_placeholder';

    if (isNaN(capacityVal) || capacityVal < 0) {
      setError('Capacity must be a non-negative number');
      setIsLoading(false);
      return;
    }

    try {
      const roomId = generateId();
      await dataService.execute({
        sql: 'INSERT INTO isolation_rooms (id, farmId, name, capacity, userId) VALUES (?, ?, ?, ?, ?)',
        params: [roomId, farmId, name, capacityVal, userId],
        table: 'isolation_rooms',
        action: 'INSERT',
        payload: { id: roomId, farmId, name, capacity: capacityVal, userId }
      });

      toast.success('Isolation room created successfully!');
      (e.target as HTMLFormElement).reset();
      setCapacity('');
      router.refresh();
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group h-full"
    >
      {/* Dynamic Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-emerald-500/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative h-full glass-morphism rounded-2xl border border-white/10 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Add Room
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Quarantine Unit</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <Input 
            name="name" 
            label="Room Identifier" 
            placeholder="e.g. Quarantine Block A" 
            required 
            autoComplete="off"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12" 
          />
          
          <Input 
            name="capacity" 
            type="number" 
            label="Max Occupancy" 
            placeholder="50" 
            required 
            value={capacity}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || parseInt(val) >= 0) {
                setCapacity(val);
              }
            }}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12" 
          />

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs font-bold text-red-400 italic">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button 
            type="submit" 
            variant="primary"
            className="w-full mt-2 h-12 rounded-xl group/btn"
            isLoading={isLoading}
          >
            <span className="flex items-center gap-2">
              Finalize Creation
              <ShieldCheck className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
            </span>
          </Button>
        </form>
      </div>
    </motion.div>
  );
};
