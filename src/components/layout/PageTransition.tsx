"use client";

import { usePathname } from "next/navigation";

/**
 * One short fade and rise when the page changes. No exit animation, so
 * navigation never waits on it. The animation is CSS (see globals.css): a
 * script-driven one kept the server-rendered page invisible until all the
 * JavaScript had loaded and run.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="flex-1 w-full h-full animate-page-enter">
      {children}
    </div>
  );
}
