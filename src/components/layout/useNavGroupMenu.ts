"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AppNavCategory } from '@/lib/app-navigation';

type GroupId = AppNavCategory['id'];

/**
 * Open/close state for the nav group menus: one group open at a time, closes on
 * navigation, on Escape (returning focus to its trigger) and on outside clicks.
 */
export function useNavGroupMenu<T extends HTMLElement>() {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<GroupId | null>(null);
  const containerRef = useRef<T>(null);
  const triggerRefs = useRef<Partial<Record<GroupId, HTMLButtonElement | null>>>({});

  const close = useCallback(() => setOpenId(null), []);
  const toggle = useCallback(
    (id: GroupId) => setOpenId((current) => (current === id ? null : id)),
    [],
  );
  const registerTrigger = useCallback(
    (id: GroupId) => (node: HTMLButtonElement | null) => {
      triggerRefs.current[id] = node;
    },
    [],
  );

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => {
    if (!openId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenId(null);
      triggerRefs.current[openId]?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpenId(null);
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openId]);

  return { openId, toggle, close, containerRef, registerTrigger };
}
