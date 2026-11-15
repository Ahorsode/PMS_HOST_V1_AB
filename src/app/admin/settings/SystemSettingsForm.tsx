'use client'

import { Gauge, Power, ShieldAlert, Wrench } from 'lucide-react'
import type { AdminAppSettings } from '@/lib/actions/admin-settings-actions'
import { PLAN_FEATURE_DETAILS, PLAN_FEATURE_KEYS } from '@/lib/billing/pricing'
import {
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_POLICY_LABELS,
  RATE_LIMIT_POLICY_NAMES,
  windowToMinutes,
} from '@/lib/performance/rate-limit-policies'
import { Card, CheckboxField, FieldError, NumberField, SaveBar, SavedStatus, TextAreaField, inputClass, useSectionEditor } from './settings-ui'

export default function SystemSettingsForm({ initial }: { initial: AdminAppSettings<'system'> }) {
  const editor = useSectionEditor('system', initial)
  const { form, setForm, errors, isSaving } = editor

  return (
    <div className="space-y-6 pb-28">
      <SavedStatus settings={editor.settings} />

      <Card icon={<Wrench className="h-5 w-5 text-emerald-200" />} title="Maintenance mode"
        description="Farms can still sign in and view their records, but saving changes is paused and a notice is shown. The admin console keeps working.">
        <CheckboxField label="Turn maintenance mode on" checked={form.maintenance.enabled} disabled={isSaving}
          onChange={(enabled) => setForm((c) => ({ ...c, maintenance: { ...c.maintenance, enabled } }))} />
        <TextAreaField label="Notice shown to farms" value={form.maintenance.message} maxLength={300} disabled={isSaving} error={errors['maintenance.message']}
          onChange={(message) => setForm((c) => ({ ...c, maintenance: { ...c.maintenance, message } }))} />
      </Card>

      <Card icon={<Power className="h-5 w-5 text-emerald-200" />} title="Turn features off for everyone"
        description="An emergency switch, separate from which plans include a feature. Ticked features are unavailable to every farm until unticked.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_FEATURE_KEYS.map((feature) => (
            <CheckboxField key={feature} label={`Turn off ${PLAN_FEATURE_DETAILS[feature].label}`} description={PLAN_FEATURE_DETAILS[feature].description}
              checked={form.disabledFeatures.includes(feature)} disabled={isSaving}
              onChange={(checked) => setForm((c) => ({
                ...c,
                disabledFeatures: checked ? [...c.disabledFeatures, feature] : c.disabledFeatures.filter((item) => item !== feature),
              }))} />
          ))}
        </div>
      </Card>

      <Card icon={<ShieldAlert className="h-5 w-5 text-emerald-200" />} title="Admin sign-in" description="Applies to sign-ins after saving.">
        <div className="sm:max-w-xs">
          <NumberField label="Admin session length (hours)" min={1} max={168} value={form.adminSessionHours} disabled={isSaving} error={errors.adminSessionHours}
            onChange={(adminSessionHours) => setForm((c) => ({ ...c, adminSessionHours }))} />
        </div>
      </Card>

      <Card icon={<Gauge className="h-5 w-5 text-emerald-200" />} title="Rate limits"
        description="How many attempts are allowed per person in a time window. Raise one if a farm hits it legitimately; leave it on the built-in limit otherwise.">
        <div className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
          {RATE_LIMIT_POLICY_NAMES.map((name) => {
            const builtIn = RATE_LIMIT_POLICIES[name]
            const override = form.rateLimits[name]
            return (
              <div key={name} className="grid gap-3 p-3 sm:grid-cols-[1.5fr_auto_1fr_1fr] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{RATE_LIMIT_POLICY_LABELS[name]}</p>
                  <p className="text-xs text-zinc-500">Built-in: {builtIn.limit} per {windowToMinutes(builtIn.window)} min</p>
                </div>
                <CheckboxField label="Custom" checked={!!override} disabled={isSaving}
                  onChange={(checked) => setForm((c) => {
                    const rateLimits = { ...c.rateLimits }
                    if (checked) rateLimits[name] = { limit: builtIn.limit, windowMinutes: windowToMinutes(builtIn.window) }
                    else delete rateLimits[name]
                    return { ...c, rateLimits }
                  })} />
                {override ? (
                  <>
                    <label className="block">
                      <span className="sr-only">Attempts</span>
                      <input type="number" min={1} value={Number.isNaN(override.limit) ? '' : override.limit} disabled={isSaving} aria-label={`${RATE_LIMIT_POLICY_LABELS[name]} attempts`}
                        onChange={(e) => setForm((c) => ({ ...c, rateLimits: { ...c.rateLimits, [name]: { ...override, limit: e.target.value === '' ? Number.NaN : Number(e.target.value) } } }))}
                        className={inputClass} />
                      <span className="text-[11px] text-zinc-500">attempts</span>
                      <FieldError message={errors[`rateLimits.${name}.limit`]} />
                    </label>
                    <label className="block">
                      <span className="sr-only">Window</span>
                      <input type="number" min={1} value={Number.isNaN(override.windowMinutes) ? '' : override.windowMinutes} disabled={isSaving} aria-label={`${RATE_LIMIT_POLICY_LABELS[name]} window in minutes`}
                        onChange={(e) => setForm((c) => ({ ...c, rateLimits: { ...c.rateLimits, [name]: { ...override, windowMinutes: e.target.value === '' ? Number.NaN : Number(e.target.value) } } }))}
                        className={inputClass} />
                      <span className="text-[11px] text-zinc-500">per minutes</span>
                      <FieldError message={errors[`rateLimits.${name}.windowMinutes`]} />
                    </label>
                  </>
                ) : (
                  <p className="text-xs text-zinc-500 sm:col-span-2">Using the built-in limit</p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <SaveBar editor={editor} />
    </div>
  )
}
