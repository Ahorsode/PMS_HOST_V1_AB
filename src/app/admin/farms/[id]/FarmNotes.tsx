'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { NotebookPen } from 'lucide-react'
import { Button, Form, FormActions, Textarea } from '@/components/ui/form'
import { adminAddFarmNote, type FarmNoteRow } from '@/lib/actions/admin-farmer-actions'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

/** Support notes on a farm: calls, promises, context for the next admin. */
export default function FarmNotes({ farmId, notes }: { farmId: string; notes: FarmNoteRow[] }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <NotebookPen className="h-5 w-5 text-emerald-200" />
        <h2 className="text-lg font-semibold text-white">Support notes</h2>
      </div>
      <div className="space-y-4 p-5">
        <Form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            startTransition(async () => {
              try {
                const result = await adminAddFarmNote(farmId, body)
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                setBody('')
                router.refresh()
              } catch {
                toast.error('Request failed. Check your connection and try again.')
              }
            })
          }}
        >
          <Textarea
            label="New note"
            rows={2}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isPending}
            placeholder="e.g. Called the owner on 3 Nov; will pay by MoMo on Friday."
          />
          <FormActions>
            <Button type="submit" variant="accent" disabled={body.trim().length < 2} isLoading={isPending} loadingText="Saving">
              Add note
            </Button>
          </FormActions>
        </Form>
        {notes.length === 0 ? (
          <p className="text-sm text-zinc-500">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                <p className="whitespace-pre-line text-sm text-zinc-100">{note.body}</p>
                <p className="mt-1 text-xs text-zinc-500">{note.adminUsername} · {formatDateTime(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
