'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export { QL_PRIMARY_ATTR } from './primary';

/**
 * True while no `data-ql-primary` element is in the viewport. The sticky bar
 * only shows then, so a screen never has two filled mint buttons in view.
 * Re-scans when the page's primary buttons change (e.g. a tab switch).
 */
export function useNoPrimaryInView(rescanKey?: unknown) {
  const [none, setNone] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const height = window.innerHeight;
      const inView = Array.from(document.querySelectorAll<HTMLElement>('[data-ql-primary]')).some((element) => {
        if (element.closest('[data-ql-sticky]')) return false;
        // Hidden at this breakpoint, or inside a hidden tab panel.
        if (element.offsetParent === null) return false;
        const rect = element.getBoundingClientRect();
        if (rect.height === 0) return false;
        const shown = Math.min(rect.bottom, height) - Math.max(rect.top, 0);
        return shown >= rect.height / 2;
      });
      setNone(!inView);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Tab switches and opening sheets add or hide primary buttons without scrolling.
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mutations.disconnect();
    };
  }, [rescanKey]);

  return none;
}

/**
 * Bottom call-to-action bar for phones. Pass `reason` to show the dim state:
 * the action is unavailable and a mono line says why.
 */
export function QlStickyBar({
  visible,
  reason,
  children,
  className,
}: {
  visible: boolean;
  /** When set, the bar shows dimmed with this reason under the action. */
  reason?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-ql-sticky=""
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-ql-line bg-ql-ground/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:hidden',
        'transition-[transform,opacity] duration-200 motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
        className,
      )}
    >
      <div className={cn(reason && 'opacity-70')}>{children}</div>
      {reason ? (
        <p className="mt-2 text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">{reason}</p>
      ) : null}
    </div>
  );
}
