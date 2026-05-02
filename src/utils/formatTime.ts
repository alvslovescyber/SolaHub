import { format, isThisWeek, isToday, isYesterday } from 'date-fns'

export { isToday, isYesterday, isThisWeek }

/**
 * Formats a Date for display in the activity feed.
 * < 1 min  → "Just now"
 * < 1 hour → "Xm ago"
 * < 1 day  → "Xh ago"
 * < 7 days → abbreviated weekday ("Mon", "Tue")
 * older    → "May 3" (or "May 3, 2024" if a different year)
 */
export function formatActivityTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 168) return format(date, 'EEE')

  const sameYear = date.getFullYear() === now.getFullYear()
  return format(date, sameYear ? 'MMM d' : 'MMM d, yyyy')
}

/**
 * Groups an array of dated items into labelled buckets.
 * Returns only non-empty buckets in Today → Yesterday → This week → Earlier order.
 */
export function groupByDate<T extends { timestamp: Date }>(
  items: T[],
  now = new Date()
): { label: string; items: T[] }[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  const buckets: { label: string; test: (t: Date) => boolean }[] = [
    { label: 'Today', test: (t) => t >= startOfToday },
    { label: 'Yesterday', test: (t) => t >= startOfYesterday && t < startOfToday },
    { label: 'This week', test: (t) => t >= startOfWeek && t < startOfYesterday },
    { label: 'Earlier', test: (t) => t < startOfWeek },
  ]

  return buckets
    .map(({ label, test }) => ({ label, items: items.filter((i) => test(i.timestamp)) }))
    .filter((g) => g.items.length > 0)
}
