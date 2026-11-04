import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { SiteSettings } from '@/lib/settings/schemas'
import { cn } from '@/lib/utils'

const TONES = {
  info: { icon: Info, className: 'border-sky-400/30 bg-sky-500/10 text-sky-100' },
  warning: { icon: TriangleAlert, className: 'border-amber-400/30 bg-amber-500/10 text-amber-100' },
  success: { icon: CheckCircle2, className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' },
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
