/** Longest team message accepted, in characters. */
export const TEAM_MESSAGE_MAX_LENGTH = 2000

export type TeamPerson = {
  firstname?: string | null
  surname?: string | null
  name?: string | null
  phoneNumber?: string | null
  email?: string | null
}

/** Trims a message and checks its length. */
export function normalizeTeamMessage(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : ''
  if (!body) return { ok: false, error: 'Write a message first.' }
  if (body.length > TEAM_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Keep messages under ${TEAM_MESSAGE_MAX_LENGTH.toLocaleString('en-GB')} characters.` }
  }
  return { ok: true, body }
}

/** The name to show for a person: first and last name, then any name, phone or email. */
export function teamPersonName(person: TeamPerson | null | undefined): string {
  if (!person) return 'Team member'
  const full = [person.firstname, person.surname].map((part) => part?.trim()).filter(Boolean).join(' ')
  return full || person.name?.trim() || person.phoneNumber || person.email || 'Team member'
}

/** Messages from the other person sent after the viewer last opened the chat. */
export function countUnreadTeamMessages(
  messages: { senderUserId: string; createdAt: Date }[],
  viewerUserId: string,
  lastReadAt: Date | null | undefined,
): number {
  return messages.filter(
    (message) => message.senderUserId !== viewerUserId && (!lastReadAt || message.createdAt > lastReadAt),
  ).length
}

/** Role labels as owners and staff see them. */
export function teamRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'OWNER':
      return 'Owner'
    case 'MANAGER':
      return 'Manager'
    case 'ACCOUNTANT':
      return 'Accountant'
    case 'FINANCE_OFFICER':
      return 'Finance officer'
    case 'CASHIER':
      return 'Cashier'
    default:
      return 'Worker'
  }
}
