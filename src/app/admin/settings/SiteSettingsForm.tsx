'use client'

import { Globe, Megaphone, MessageSquareQuote, Phone, Plus, Trash2 } from 'lucide-react'
import type { AdminAppSettings } from '@/lib/actions/admin-settings-actions'
import { PAID_TIERS, PLAN_TYPES, type PaidTier } from '@/lib/billing/pricing'
import type { SiteSettings } from '@/lib/settings/schemas'
import type { PlanType } from '@prisma/client'
import { Card, CheckboxField, SaveBar, SavedStatus, TextAreaField, TextField, inputClass, useSectionEditor } from './settings-ui'

/** ISO (UTC) -> value for <input type="datetime-local"> in the admin's own time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

export default function SiteSettingsForm({
  initial,
  planNames,
}: {
  initial: AdminAppSettings<'site'>
  planNames: Record<PlanType, Record<PaidTier, string>>
}) {
  const editor = useSectionEditor('site', initial)
  const { form, setForm, errors, isSaving } = editor
  const set = (patch: (current: SiteSettings) => SiteSettings) => setForm((current) => patch(current))
  const landing = form.landing

  return (
    <div className="space-y-6 pb-28">
      <SavedStatus settings={editor.settings} />

      <Card icon={<Megaphone className="h-5 w-5 text-emerald-200" />} title="Announcement banner"
        description="A message across the top of the farm dashboard and/or the public website, e.g. a price change or planned maintenance.">
        <CheckboxField label="Show the announcement" checked={form.announcement.enabled} disabled={isSaving}
          onChange={(enabled) => set((c) => ({ ...c, announcement: { ...c.announcement, enabled } }))} />
        <TextAreaField label="Message" value={form.announcement.message} maxLength={300} disabled={isSaving} error={errors['announcement.message']}
          onChange={(message) => set((c) => ({ ...c, announcement: { ...c.announcement, message } }))} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-300">Style</span>
            <select value={form.announcement.tone} disabled={isSaving} className={`${inputClass} mt-1`}
              onChange={(e) => set((c) => ({ ...c, announcement: { ...c.announcement, tone: e.target.value as SiteSettings['announcement']['tone'] } }))}>
              <option value="info">Information (blue)</option>
              <option value="warning">Warning (amber)</option>
              <option value="success">Good news (green)</option>
            </select>
          </label>
          <TextField type="datetime-local" label="Starts (optional)" value={toLocalInput(form.announcement.startsAt)} disabled={isSaving} error={errors['announcement.startsAt']}
            onChange={(value) => set((c) => ({ ...c, announcement: { ...c.announcement, startsAt: fromLocalInput(value) } }))} />
          <TextField type="datetime-local" label="Ends (optional)" value={toLocalInput(form.announcement.endsAt)} disabled={isSaving} error={errors['announcement.endsAt']}
            onChange={(value) => set((c) => ({ ...c, announcement: { ...c.announcement, endsAt: fromLocalInput(value) } }))} />
        </div>
        <div className="flex flex-wrap gap-6">
          <CheckboxField label="On the farm dashboard" checked={form.announcement.showOnDashboard} disabled={isSaving}
            onChange={(showOnDashboard) => set((c) => ({ ...c, announcement: { ...c.announcement, showOnDashboard } }))} />
          <CheckboxField label="On the public website" checked={form.announcement.showOnLanding} disabled={isSaving}
            onChange={(showOnLanding) => set((c) => ({ ...c, announcement: { ...c.announcement, showOnLanding } }))} />
        </div>
      </Card>

      <Card icon={<Phone className="h-5 w-5 text-emerald-200" />} title="Contact details" description="Shown in the website footer and on the contact links.">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField type="email" label="Email" value={form.contact.email} disabled={isSaving} error={errors['contact.email']}
            onChange={(email) => set((c) => ({ ...c, contact: { ...c.contact, email } }))} />
          <TextField label="Phone (as shown)" value={form.contact.phoneDisplay} disabled={isSaving} error={errors['contact.phoneDisplay']}
            onChange={(phoneDisplay) => set((c) => ({ ...c, contact: { ...c.contact, phoneDisplay } }))} />
          <TextField label="Phone with country code" value={form.contact.phoneInternational} disabled={isSaving} error={errors['contact.phoneInternational']}
            hint="Digits only, e.g. 233554101675. Used for call and WhatsApp links."
            onChange={(phoneInternational) => set((c) => ({ ...c, contact: { ...c.contact, phoneInternational } }))} />
        </div>
        <CheckboxField label="Show a WhatsApp link" checked={form.contact.whatsappEnabled} disabled={isSaving}
          onChange={(whatsappEnabled) => set((c) => ({ ...c, contact: { ...c.contact, whatsappEnabled } }))} />
      </Card>

      <Card icon={<Globe className="h-5 w-5 text-emerald-200" />} title="Website text" description="The public landing page.">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Badge above the headline" value={landing.heroBadge} disabled={isSaving} error={errors['landing.heroBadge']}
            onChange={(heroBadge) => set((c) => ({ ...c, landing: { ...c.landing, heroBadge } }))} />
          <TextField label="Headline" value={landing.heroTitle} disabled={isSaving} error={errors['landing.heroTitle']}
            onChange={(heroTitle) => set((c) => ({ ...c, landing: { ...c.landing, heroTitle } }))} />
          <TextField label="Headline accent (green line)" value={landing.heroTitleAccent} disabled={isSaving} error={errors['landing.heroTitleAccent']}
            onChange={(heroTitleAccent) => set((c) => ({ ...c, landing: { ...c.landing, heroTitleAccent } }))} />
        </div>
        <TextAreaField label="Intro paragraph" value={landing.heroSubtitle} maxLength={400} disabled={isSaving} error={errors['landing.heroSubtitle']}
          onChange={(heroSubtitle) => set((c) => ({ ...c, landing: { ...c.landing, heroSubtitle } }))} />
        <TextAreaField label="Pricing intro" value={landing.pricingIntro} maxLength={400} disabled={isSaving} error={errors['landing.pricingIntro']}
          hint="{trialDays} is replaced with the free trial length. The term-discount sentence is added automatically."
          onChange={(pricingIntro) => set((c) => ({ ...c, landing: { ...c.landing, pricingIntro } }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Closing headline" value={landing.ctaTitle} disabled={isSaving} error={errors['landing.ctaTitle']}
            onChange={(ctaTitle) => set((c) => ({ ...c, landing: { ...c.landing, ctaTitle } }))} />
          <TextField label="Closing text" value={landing.ctaSubtitle} disabled={isSaving} error={errors['landing.ctaSubtitle']}
            onChange={(ctaSubtitle) => set((c) => ({ ...c, landing: { ...c.landing, ctaSubtitle } }))} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_TYPES.flatMap((planType) =>
            PAID_TIERS.map((tier) => (
              <TextField key={`${planType}-${tier}`} label={`${planNames[planType][tier]} description`}
                value={landing.planDescriptions[planType][tier]} disabled={isSaving} error={errors[`landing.planDescriptions.${planType}.${tier}`]}
                onChange={(value) => set((c) => ({
                  ...c,
                  landing: { ...c.landing, planDescriptions: { ...c.landing.planDescriptions, [planType]: { ...c.landing.planDescriptions[planType], [tier]: value } } },
                }))} />
            )),
          )}
        </div>
        <label className="block sm:max-w-sm">
          <span className="text-xs font-semibold text-zinc-300">&quot;Most popular&quot; badge</span>
          <select disabled={isSaving} className={`${inputClass} mt-1`}
            value={landing.highlightedPlan ? `${landing.highlightedPlan.planType}:${landing.highlightedPlan.tier}` : ''}
            onChange={(e) => {
              const [planType, tier] = e.target.value.split(':') as [PlanType, PaidTier]
              set((c) => ({ ...c, landing: { ...c.landing, highlightedPlan: e.target.value ? { planType, tier } : null } }))
            }}>
            <option value="">No badge</option>
            {PLAN_TYPES.flatMap((planType) => PAID_TIERS.map((tier) => (
              <option key={`${planType}:${tier}`} value={`${planType}:${tier}`}>{planNames[planType][tier]}</option>
            )))}
          </select>
        </label>
      </Card>

      <Card icon={<MessageSquareQuote className="h-5 w-5 text-emerald-200" />} title="Testimonials & FAQ"
        description="Optional sections on the landing page; each is hidden while it is empty.">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Testimonials ({landing.testimonials.length}/6)</p>
          {landing.testimonials.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-zinc-800 p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start">
              <TextAreaField label="Quote" rows={2} value={item.quote} disabled={isSaving} error={errors[`landing.testimonials.${index}.quote`]}
                onChange={(quote) => set((c) => ({ ...c, landing: { ...c.landing, testimonials: c.landing.testimonials.map((t, i) => (i === index ? { ...t, quote } : t)) } }))} />
              <TextField label="Name" value={item.name} disabled={isSaving} error={errors[`landing.testimonials.${index}.name`]}
                onChange={(name) => set((c) => ({ ...c, landing: { ...c.landing, testimonials: c.landing.testimonials.map((t, i) => (i === index ? { ...t, name } : t)) } }))} />
              <TextField label="Farm or role" value={item.detail} disabled={isSaving} error={errors[`landing.testimonials.${index}.detail`]}
                onChange={(detail) => set((c) => ({ ...c, landing: { ...c.landing, testimonials: c.landing.testimonials.map((t, i) => (i === index ? { ...t, detail } : t)) } }))} />
              <button type="button" aria-label="Remove testimonial" disabled={isSaving}
                onClick={() => set((c) => ({ ...c, landing: { ...c.landing, testimonials: c.landing.testimonials.filter((_, i) => i !== index) } }))}
                className="mt-5 flex h-10 w-10 items-center justify-center rounded-md border border-red-500/40 text-red-200 hover:bg-red-950/40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {landing.testimonials.length < 6 ? (
            <button type="button" disabled={isSaving}
              onClick={() => set((c) => ({ ...c, landing: { ...c.landing, testimonials: [...c.landing.testimonials, { quote: '', name: '', detail: '' }] } }))}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500">
              <Plus className="h-4 w-4" /> Add testimonial
            </button>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-zinc-800 pt-4">
          <p className="text-sm font-semibold text-zinc-200">Frequently asked questions ({landing.faq.length}/12)</p>
          {landing.faq.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-zinc-800 p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
              <TextField label="Question" value={item.question} disabled={isSaving} error={errors[`landing.faq.${index}.question`]}
                onChange={(question) => set((c) => ({ ...c, landing: { ...c.landing, faq: c.landing.faq.map((f, i) => (i === index ? { ...f, question } : f)) } }))} />
              <TextAreaField label="Answer" rows={2} value={item.answer} disabled={isSaving} error={errors[`landing.faq.${index}.answer`]}
                onChange={(answer) => set((c) => ({ ...c, landing: { ...c.landing, faq: c.landing.faq.map((f, i) => (i === index ? { ...f, answer } : f)) } }))} />
              <button type="button" aria-label="Remove question" disabled={isSaving}
                onClick={() => set((c) => ({ ...c, landing: { ...c.landing, faq: c.landing.faq.filter((_, i) => i !== index) } }))}
                className="mt-5 flex h-10 w-10 items-center justify-center rounded-md border border-red-500/40 text-red-200 hover:bg-red-950/40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {landing.faq.length < 12 ? (
            <button type="button" disabled={isSaving}
              onClick={() => set((c) => ({ ...c, landing: { ...c.landing, faq: [...c.landing.faq, { question: '', answer: '' }] } }))}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500">
              <Plus className="h-4 w-4" /> Add question
            </button>
          ) : null}
        </div>
      </Card>

      <SaveBar editor={editor} />
    </div>
  )
}
