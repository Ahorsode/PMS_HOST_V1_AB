'use client'

import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { HouseForm } from './HouseForm';

export const HouseActionsHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add New House
      </Button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Add New House">
        <HouseForm mode="create" onClose={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
};

export const HouseCardActions = ({ house }: { house: any }) => {
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => setMode('edit')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
        <Edit2 className="h-4 w-4" />
      </button>
      <button onClick={() => setMode('delete')} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog isOpen={mode !== null} onOpenChange={(open) => !open && setMode(null)} title={mode === 'edit' ? 'Edit House' : 'Delete House'}>
        {mode && <HouseForm house={house} mode={mode} onClose={() => setMode(null)} />}
      </Dialog>
    </div>
  );
};
