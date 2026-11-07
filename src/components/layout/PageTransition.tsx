"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

/** One short fade and rise when the page changes. No exit animation, so navigation never waits on it. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 w-full h-full"
    >
      {children}
    </motion.div>
  );
}
