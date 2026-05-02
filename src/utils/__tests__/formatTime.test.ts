import { describe, expect, it } from 'vitest'
import { formatActivityTime, groupByDate } from '../formatTime'

// Fixed reference time: 2025-05-02 12:00:00 UTC
const NOW = new Date('2025-05-02T12:00:00Z')
const ms = (delta: number) => new Date(NOW.getTime() - delta)

describe('formatActivityTime', () => {
  it('returns "Just now" for timestamps under 1 minute ago', () => {
    expect(formatActivityTime(ms(30_000), NOW)).toBe('Just now')
    expect(formatActivityTime(ms(59_999), NOW)).toBe('Just now')
  })

  it('returns "Xm ago" for timestamps under 1 hour ago', () => {
    expect(formatActivityTime(ms(60_000), NOW)).toBe('1m ago')
    expect(formatActivityTime(ms(30 * 60_000), NOW)).toBe('30m ago')
    expect(formatActivityTime(ms(59 * 60_000), NOW)).toBe('59m ago')
  })

  it('returns "Xh ago" for timestamps under 24 hours ago', () => {
    expect(formatActivityTime(ms(60 * 60_000), NOW)).toBe('1h ago')
    expect(formatActivityTime(ms(5 * 3_600_000), NOW)).toBe('5h ago')
    expect(formatActivityTime(ms(23 * 3_600_000), NOW)).toBe('23h ago')
  })

  it('returns abbreviated weekday for timestamps 1–7 days ago', () => {
    const result = formatActivityTime(ms(2 * 86_400_000), NOW)
    // Should be a short weekday name like "Mon", "Tue", etc.
    expect(result).toMatch(/^[A-Z][a-z]{2}$/)
  })

  it('returns "MMM d" for timestamps older than 7 days in the same year', () => {
    expect(formatActivityTime(ms(10 * 86_400_000), NOW)).toBe('Apr 22')
  })

  it('includes year for timestamps in a different year', () => {
    const oldDate = new Date('2024-01-15T10:00:00Z')
    const result = formatActivityTime(oldDate, NOW)
    expect(result).toContain('2024')
  })
})

describe('groupByDate', () => {
  it('returns empty array when given empty input', () => {
    expect(groupByDate([], NOW)).toEqual([])
  })

  it('groups items into correct buckets', () => {
    const items = [
      { timestamp: ms(30_000), id: 'a' },       // Today
      { timestamp: ms(36 * 3_600_000), id: 'b' }, // Yesterday
      { timestamp: ms(4 * 86_400_000), id: 'c' }, // This week
      { timestamp: ms(20 * 86_400_000), id: 'd' }, // Earlier
    ]
    const groups = groupByDate(items, NOW)
    expect(groups).toHaveLength(4)
    expect(groups[0].label).toBe('Today')
    expect(groups[0].items).toHaveLength(1)
    expect(groups[1].label).toBe('Yesterday')
    expect(groups[2].label).toBe('This week')
    expect(groups[3].label).toBe('Earlier')
  })

  it('omits empty buckets', () => {
    const items = [{ timestamp: ms(30_000), id: 'a' }]
    const groups = groupByDate(items, NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Today')
  })

  it('sorts correctly — most recent bucket first', () => {
    const items = [
      { timestamp: ms(20 * 86_400_000), id: 'old' },
      { timestamp: ms(30_000), id: 'new' },
    ]
    const groups = groupByDate(items, NOW)
    expect(groups[0].label).toBe('Today')
    expect(groups[1].label).toBe('Earlier')
  })
})
