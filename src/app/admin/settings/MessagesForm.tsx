'use client'

import { BellRing, CalendarClock } from 'lucide-react'
import type { AdminAppSettings } from '@/lib/actions/admin-settings-actions'
import { fillTemplate, MESSAGE_KIND_DETAILS, MESSAGE_KINDS, MESSAGE_PLACEHOLDERS, type MessageKind } from '@/lib/settings/schemas'
import { Card, CheckboxField, NumberField, SaveBar, SavedStatus, TextAreaField, TextField, useSectionEditor } from './settings-ui'

const SAMPLE = { farmName: 'Asante Layers', planName: 'Business Plus', endDate: '12 Dec 2026', daysLeft: '5' }

export default function MessagesForm({ initial }: { initial: AdminAppSettings<'messages'> }) {
  const editor = useSectionEditor('messages', initial)
  const { form, setForm, errors, isSaving } = editor

  const setTemplate = (kind: MessageKind, patch: Partial<(typeof form)['templates'][MessageKind]>) =>
    setForm((c) => ({ ...c, templates: { ...c.templates, [kind]: { ...c.templates[kind], ...patch } } }))

  return (
    <div className="space-y-6 pb-28">
      <SavedStatus settings={editor.settings} />

      <Card icon={<CalendarClock className="h-5 w-5 text-emerald-200" />} title="When notices appear"
        description="Notices show at the top of the farm dashboard. Farmers can dismiss each one.">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Welcome: show for the first (days)" min={1} max={30} value={form.schedule.welcomeDays} disabled={isSaving} error={errors['schedule.welcomeDays']}
            onChange={(welcomeDays) => setForm((c) => ({ ...c, schedule: { ...c.schedule, welcomeDays } }))} />
          <NumberField label="Trial ending: start (days before)" min={1} max={30} value={form.schedule.trialEndingDaysBefore} disabled={isSaving} error={errors['schedule.trialEndingDaysBefore']}
            onChange={(trialEndingDaysBefore) => setForm((c) => ({ ...c, schedule: { ...c.schedule, trialEndingDaysBefore } }))} />
          <NumberField label="Payment received: show for (days)" min={1} max={14} value={form.schedule.paymentReceivedDays} disabled={isSaving} error={errors['schedule.paymentReceivedDays']}
            onChange={(paymentReceivedDays) => setForm((c) => ({ ...c, schedule: { ...c.schedule, paymentReceivedDays } }))} />
        </div>
      </Card>

      <Card icon={<BellRing className="h-5 w-5 text-emerald-200" />} title="Message templates"
        description={`Placeholders: ${MESSAGE_PLACEHOLDERS.join(', ')}. They are filled in for each farm.`}>
        <div className="grid gap-4 lg:grid-cols-2">
          {MESSAGE_KINDS.map((kind) => {
            const template = form.templates[kind]
            return (
              <div key={kind} className="space-y-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{MESSAGE_KIND_DETAILS[kind].label}</p>
                  <p className="text-xs text-zinc-500">{MESSAGE_KIND_DETAILS[kind].when}</p>
                </div>
                <CheckboxField label="Show this notice" checked={template.enabled} disabled={isSaving} onChange={(enabled) => setTemplate(kind, { enabled })} />
                <TextField label="Title" value={template.title} maxLength={80} disabled={isSaving} error={errors[`templates.${kind}.title`]}
                  onChange={(title) => setTemplate(kind, { title })} />
                <TextAreaField label="Message" value={template.body} maxLength={500} disabled={isSaving} error={errors[`templates.${kind}.body`]}
                  onChange={(body) => setTemplate(kind, { body })} />
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/70">Preview</p>
                  <p className="mt-1 font-semibold text-white">{fillTemplate(template.title, SAMPLE)}</p>
                  <p className="mt-1 text-zinc-300">{fillTemplate(template.body, SAMPLE)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <SaveBar editor={editor} />
    </div>
  )
}
