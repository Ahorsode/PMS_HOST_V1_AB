import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { SiteSettings } from '@/lib/settings/schemas'
import { cn } from '@/lib/utils'

const TONES = {
  info: { icon: Info, className: 'border-fg/[0.08] bg-fg/[0.06] text-fg' },
  warning: { icon: TriangleAlert, className: 'border-fg/[0.08] bg-fg/[0.04] text-yolk' },
  success: { icon: CheckCircle2, className: 'border-fg/[0.08] bg-fg/[0.04] text-fg' },
} as const

/** Admin-set announcement (Settings → Website & announcements). */
export function AnnouncementBanner({ announcement, className }: { announcement: SiteSettings['announcement']; className?: string }) {
  const tone = TONES[announcement.tone]
  const Icon = tone.icon
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-6', tone.className, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="whitespace-pre-line">{announcement.message}</p>
    </div>
  )
}
