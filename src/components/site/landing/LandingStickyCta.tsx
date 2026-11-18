'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { qlButton } from '@/components/ui/ql/Button';
import { QlStickyBar, useNoPrimaryInView } from '@/components/ui/ql/StickyBar';

/** Phone sticky bar: only while no filled mint button is on screen (e.g. the hero's has scrolled away). */
export function LandingStickyCta() {
  const visible = useNoPrimaryInView();
  return (
    <QlStickyBar visible={visible}>
      <Link href="/signup" tabIndex={visible ? undefined : -1} className={qlButton('filled', 'w-full')}>
        Create your farm account
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </QlStickyBar>
  );
}
