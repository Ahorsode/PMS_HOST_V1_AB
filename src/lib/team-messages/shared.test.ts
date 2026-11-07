import { describe, expect, it } from 'vitest'
import { TEAM_MESSAGE_MAX_LENGTH, countUnreadTeamMessages, normalizeTeamMessage, teamPersonName } from './shared'

describe('normalizeTeamMessage', () => {
  it('trims and keeps line breaks', () => {
    expect(normalizeTeamMessage('  Check house 2\r\nbefore noon  ')).toEqual({ ok: true, body: 'Check house 2\nbefore noon' })
  })

  it('rejects empty and over-long messages', () => {
    expect(normalizeTeamMessage('   ').ok).toBe(false)
    expect(normalizeTeamMessage(undefined).ok).toBe(false)
    expect(normalizeTeamMessage('a'.repeat(TEAM_MESSAGE_MAX_LENGTH + 1)).ok).toBe(false)
    expect(normalizeTeamMessage('a'.repeat(TEAM_MESSAGE_MAX_LENGTH)).ok).toBe(true)
  })
})

describe('teamPersonName', () => {
  it('prefers first and last name, then falls back', () => {
    expect(teamPersonName({ firstname: 'Ama', surname: 'Mensah', name: 'ama' })).toBe('Ama Mensah')
    expect(teamPersonName({ name: 'Kofi' })).toBe('Kofi')
    expect(teamPersonName({ phoneNumber: '+233200000000' })).toBe('+233200000000')
    expect(teamPersonName(null)).toBe('Team member')
  })
})

describe('countUnreadTeamMessages', () => {
  const at = (minute: number) => new Date(2026, 10, 7, 9, minute)
  const messages = [
    { senderUserId: 'owner', createdAt: at(1) },
    { senderUserId: 'worker', createdAt: at(2) },
    { senderUserId: 'owner', createdAt: at(5) },
  ]

  it('counts only the other person’s messages after the last read', () => {
    expect(countUnreadTeamMessages(messages, 'worker', at(3))).toBe(1)
    expect(countUnreadTeamMessages(messages, 'worker', null)).toBe(2)
    expect(countUnreadTeamMessages(messages, 'owner', at(0))).toBe(1)
    expect(countUnreadTeamMessages(messages, 'owner', at(9))).toBe(0)
  })
})
