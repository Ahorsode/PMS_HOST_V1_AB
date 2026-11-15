'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Check, RotateCcw, Save } from 'lucide-react'
import { adminSaveAppSettings, type AdminAppSettings } from '@/lib/actions/admin-settings-actions'
import { APP_SETTINGS_SECTIONS, type AppSettingsSection, type AppSettingsValue } from '@/lib/settings/schemas'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, Textarea, controlClass, fieldStyles } from '@/components/ui/form'

/** The shared field look, for admin controls that can't use Input / Select directly. */
export const inputClass = controlClass()

/** Form state, validation, save and reset for one settings section. */
export function useSectionEditor<S extends AppSettingsSection>(section: S, initial: AdminAppSettings<S>) {
  const [settings, setSettings] = useState(initial)
  const [form, setForm] = useState<AppSettingsValue<S>>(initial.value)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const isDirty = JSON.stringify(form) !== JSON.stringify(settings.value)
  const errors = useMemo(() => {
    const parsed = APP_SETTINGS_SECTIONS[section].schema.safeParse(form)
    const map: Record<string, string> = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        map[issue.path.map(String).join('.')] ??= issue.message.includes('expected number') ? 'Enter a number' : issue.message
      }
    }
    return map
  }, [form, section])

  function save() {
    if (isSaving || Object.keys(errors).length > 0) return
    setSaveError(null)
    startSaving(async () => {
      try {
        const result = await adminSaveAppSettings(section, form)
        if (!result.success) {
          setSaveError(result.error)
          return
        }
        setSettings(result.settings)
        setForm(result.settings.value)
        toast.success(`${APP_SETTINGS_SECTIONS[section].label} saved. Changes are live.`)
      } catch (error) {
        console.error('[settings] save failed', error)
        setSaveError('Request failed. Check your connection and try again.')
      }
    })
  }

  return {
    form,
    setForm,
    settings,
    errors,
    isDirty,
    isSaving,
    saveError,
    save,
    discard: () => {
      setForm(settings.value)
      setSaveError(null)
    },
    loadDefaults: () => setForm(APP_SETTINGS_SECTIONS[section].defaults as AppSettingsValue<S>),
  }
}

/** The parts of an editor the save bar needs; independent of the section's value type. */
type SaveBarEditor = Pick<ReturnType<typeof useSectionEditor<AppSettingsSection>>, 'errors' | 'isDirty' | 'isSaving' | 'saveError' | 'save' | 'discard' | 'loadDefaults'>

function formatDateTime(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-GH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function SavedStatus({ settings }: { settings: Pick<AdminAppSettings<AppSettingsSection>, 'isDefault' | 'updatedAt' | 'updatedBy' | 'storedInvalid'> }) {
  return (
    <p className="text-[13px] leading-5 text-fg-3">
      {settings.isDefault
        ? 'Using the built-in defaults (never saved)'
        : `Last saved ${formatDateTime(settings.updatedAt)}${settings.updatedBy ? ` by ${settings.updatedBy}` : ''}`}
      {settings.storedInvalid ? ' · the saved value could not be read, so defaults are live; save to fix it' : ''}
    </p>
  )
}

/** The pinned footer for a settings page: status on the left, buttons on the right. */
export function SaveBar({ editor, note }: { editor: SaveBarEditor; note?: ReactNode }) {
  const hasErrors = Object.keys(editor.errors).length > 0
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-fg/[0.08] bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1 text-[13px] leading-5">
          {editor.saveError ? <p className="font-medium text-neg">{editor.saveError}</p> : null}
          {hasErrors ? (
            <p className="font-medium text-neg">Fix the fields marked in red to save.</p>
          ) : editor.isDirty ? (
            note ?? <p className="text-fg-2">You have unsaved changes.</p>
          ) : (
            <p className="flex items-center gap-1.5 text-fg-3">
              <Check className="h-4 w-4" strokeWidth={1.75} /> All changes saved
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 [&>*]:min-h-11">
          <Button type="button" variant="ghost" onClick={editor.loadDefaults} disabled={editor.isSaving}>
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} /> Load defaults
          </Button>
          <Button type="button" variant="outline" onClick={editor.discard} disabled={editor.isSaving || !editor.isDirty}>
            Discard changes
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={editor.save}
            disabled={!editor.isDirty || hasErrors}
            isLoading={editor.isSaving}
            loadingText="Saving"
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4" strokeWidth={1.75} /> Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Card({ icon, title, description, children }: { icon?: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-fg/[0.08] bg-card">
      <div className="flex items-center gap-3 border-b border-fg/[0.08] px-5 py-4">
        {icon}
        <div>
          <h2 className="text-base font-semibold leading-6 text-fg">{title}</h2>
          {description ? <p className="text-[13px] leading-5 text-fg-3">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className={cn(fieldStyles.error, 'mt-1.5')}>{message}</p> : null
}

export function TextField({ label, value, onChange, error, disabled, placeholder, hint, maxLength, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  placeholder?: string
  hint?: string
  maxLength?: number
  type?: 'text' | 'email' | 'datetime-local'
}) {
  return (
    <Input
      label={label}
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      hint={hint}
      error={error}
    />
  )
}

export function TextAreaField({ label, value, onChange, error, disabled, rows = 3, hint, maxLength }: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  rows?: number
  hint?: string
  maxLength?: number
}) {
  return (
    <Textarea
      label={label}
      rows={rows}
      value={value}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      hint={hint}
      error={error}
    />
  )
}

/** Empty input becomes NaN so validation asks for a number instead of saving 0. */
export function NumberField({ label, value, onChange, error, disabled, min, max, hint, placeholder }: {
  label: string
  value: number | null
  onChange: (value: number) => void
  error?: string
  disabled?: boolean
  min?: number
  max?: number
  hint?: string
  placeholder?: string
}) {
  return (
    <Input
      label={label}
      type="number"
      min={min}
      max={max}
      step={1}
      placeholder={placeholder}
      disabled={disabled}
      value={value === null || Number.isNaN(value) ? '' : value}
      onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
      hint={hint}
      error={error}
    />
  )
}

export function CheckboxField({ label, description, checked, onChange, disabled }: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <Checkbox
      label={<span className="font-medium">{label}</span>}
      hint={description}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}
