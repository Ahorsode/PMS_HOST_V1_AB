'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu';

/** Phone ⋯ menu for the Inbox: Reminder settings lives here instead of a big button above the tabs. */
export function InboxMenu() {
  const router = useRouter();
  return (
    <QlOverflowMenu
      label="Inbox options"
      placement="below"
      items={[{ label: 'Reminder settings', icon: SlidersHorizontal, onSelect: () => router.push('/dashboard/settings?tab=notifications') }]}
    />
  );
}
