'use client'

import { LazyMotion } from 'framer-motion'

const loadFeatures = () => import('./motion-features').then((mod) => mod.default)

/**
 * Lets <m.*> components share one animation engine that is downloaded after
 * the page instead of being part of every page's first JavaScript. The
 * animations are the same; components that still use <motion.*> keep working.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>
}
