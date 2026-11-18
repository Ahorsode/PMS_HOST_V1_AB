/**
 * Where a health schedule stands, for the phone list and week strip. Amber is
 * due, coral is late, mint is done; planned doses stay neutral. Uses the same
 * local-day comparison as the overdue mark on the desktop list.
 */
export type ScheduleState = 'due' | 'overdue' | 'planned' | 'done' | 'cancelled';

export type ScheduleLike = { scheduledDate: string | Date; status: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(value: string | Date | number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function scheduleState(record: ScheduleLike, today = startOfDay(Date.now())): ScheduleState {
  if (record.status === 'COMPLETED') return 'done';
  if (record.status === 'CANCELLED') return 'cancelled';
  const day = startOfDay(record.scheduledDate);
  if (day < today) return 'overdue';
  if (day.getTime() === today.getTime()) return 'due';
  return 'planned';
}

/** Whole days between the scheduled day and today (positive when late). */
export function daysFromToday(record: ScheduleLike, today = startOfDay(Date.now())) {
  return Math.round((today.getTime() - startOfDay(record.scheduledDate).getTime()) / DAY_MS);
}

export type ScheduleGroup = 'today' | 'overdue' | 'week' | 'later' | 'done' | 'cancelled';

export const GROUP_LABEL: Record<ScheduleGroup, string> = {
  today: 'Today',
  overdue: 'Overdue',
  week: 'This week',
  later: 'Later',
  done: 'Done',
  cancelled: 'Cancelled',
};

export function scheduleGroup(record: ScheduleLike, today = startOfDay(Date.now())): ScheduleGroup {
  const state = scheduleState(record, today);
  if (state === 'due') return 'today';
  if (state === 'overdue') return 'overdue';
  if (state === 'done') return 'done';
  if (state === 'cancelled') return 'cancelled';
  return -daysFromToday(record, today) <= 6 ? 'week' : 'later';
}

const GROUP_ORDER: ScheduleGroup[] = ['today', 'overdue', 'week', 'later', 'done', 'cancelled'];

/** Records bucketed for the list, in reading order; empty groups are left out. */
export function groupSchedules<T extends ScheduleLike>(records: T[], today = startOfDay(Date.now())) {
  const buckets = new Map<ScheduleGroup, T[]>();
  for (const record of records) {
    const group = scheduleGroup(record, today);
    buckets.set(group, [...(buckets.get(group) ?? []), record]);
  }
  for (const [group, list] of buckets) {
    // Soonest first, except finished work, which reads most recent first.
    const sign = group === 'done' || group === 'cancelled' ? -1 : 1;
    list.sort((a, b) => sign * (startOfDay(a.scheduledDate).getTime() - startOfDay(b.scheduledDate).getTime()));
  }
  return GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => ({ group, records: buckets.get(group)! }));
}

export type WeekDay = { date: Date; isToday: boolean; state: 'empty' | 'planned' | 'due' | 'done' };

/** The next seven days from today with the strongest state on each. */
export function weekStrip(records: ScheduleLike[], today = startOfDay(Date.now())): WeekDay[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today.getTime() + offset * DAY_MS);
    const onDay = records.filter((record) => startOfDay(record.scheduledDate).getTime() === date.getTime());
    const pending = onDay.some((record) => record.status === 'PENDING');
    const done = onDay.some((record) => record.status === 'COMPLETED');
    const state: WeekDay['state'] = pending ? (offset === 0 ? 'due' : 'planned') : done ? 'done' : 'empty';
    return { date, isToday: offset === 0, state };
  });
}
