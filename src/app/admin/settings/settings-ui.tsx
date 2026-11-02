'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Check, RotateCcw, Save } from 'lucide-react'
import { adminSaveAppSettings, type AdminAppSettings } from '@/lib/actions/admin-settings-actions'
import { APP_SETTINGS_SECTIONS, type AppSettingsSection, type AppSettingsValue } from '@/lib/settings/schemas'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

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
    <p className="text-xs text-zinc-500">
      {settings.isDefault
        ? 'Using the built-in defaults (never saved)'
        : `Last saved ${formatDateTime(settings.updatedAt)}${settings.updatedBy ? ` by ${settings.updatedBy}` : ''}`}
      {settings.storedInvalid ? ' · the saved value could not be read, so defaults are live; save to fix it' : ''}
    </p>
  )
}

export function SaveBar({ editor, note }: { editor: SaveBarEditor; note?: ReactNode }) {
  const hasErrors = Object.keys(editor.errors).length > 0
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1 text-xs">
          {editor.saveError ? <p className="font-semibold text-red-300">{editor.saveError}</p> : null}
          {hasErrors ? (
            <p className="font-semibold text-red-300">Fix the highlighted fields to save.</p>
          ) : editor.isDirty ? (
            note ?? <p className="text-zinc-400">Unsaved changes.</p>
          ) : (
            <p className="flex items-center gap-1.5 text-zinc-500">
              <Check className="h-3.5 w-3.5" /> All changes saved
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={editor.loadDefaults} disabled={editor.isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
            <RotateCcw className="h-4 w-4" /> Load defaults
          </button>
          <button type="button" onClick={editor.discard} disabled={editor.isSaving || !editor.isDirty}
            className="h-10 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
            Discard changes
          </button>
          <button type="button" onClick={editor.save} disabled={editor.isSaving || !editor.isDirty || hasErrors}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" /> {editor.isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Card({ icon, title, description, children }: { icon?: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description ? <p className="text-xs text-zinc-500">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-semibold text-red-300">{message}</p> : null
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
    <label className="block">
      <span className="text-xs font-semibold text-zinc-300">{label}</span>
      <input type={type} value={value} placeholder={placeholder} maxLength={maxLength} disabled={disabled}
        onChange={(event) => onChange(event.target.value)} className={cn(inputClass, 'mt-1')} />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <FieldError message={error} />
    </label>
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
    <label className="block">
      <span className="text-xs font-semibold text-zinc-300">{label}</span>
      <textarea rows={rows} value={value} maxLength={maxLength} disabled={disabled} onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-50" />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <FieldError message={error} />
    </label>
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
    <label className="block">
      <span className="text-xs font-semibold text-zinc-300">{label}</span>
      <input type="number" min={min} max={max} step={1} placeholder={placeholder} disabled={disabled}
        value={value === null || Number.isNaN(value) ? '' : value}
        onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
        className={cn(inputClass, 'mt-1')} />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <FieldError message={error} />
    </label>
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
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500" />
      <span>
        <span className="block text-sm font-semibold text-zinc-100">{label}</span>
        {description ? <span className="block text-xs text-zinc-500">{description}</span> : null}
      </span>
    </label>
  )
}
