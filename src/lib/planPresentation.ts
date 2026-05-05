import { readJsonStorage, writeJsonStorage } from '@/lib/safeStorage'

const STORAGE_KEY = 'solahub:plan-presentation'

export const PLAN_EMOJIS = [
  '📖',
  '🙏',
  '✝️',
  '🕊️',
  '🌿',
  '🌟',
  '🔥',
  '👑',
  '⛪',
  '🎵',
  '📜',
  '🌅',
  '💡',
  '🌊',
  '🎺',
  '🕯️',
]

export interface PlanAccentColor {
  id: string
  label: string
  hex: string
  tailwind: string
}

export const PLAN_ACCENT_COLORS: PlanAccentColor[] = [
  { id: 'brand', label: 'Indigo', hex: '#3b6bff', tailwind: 'bg-[#3b6bff]' },
  { id: 'emerald', label: 'Emerald', hex: '#059669', tailwind: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber', hex: '#d97706', tailwind: 'bg-amber-600' },
  { id: 'rose', label: 'Rose', hex: '#e11d48', tailwind: 'bg-rose-600' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed', tailwind: 'bg-violet-600' },
  { id: 'slate', label: 'Slate', hex: '#475569', tailwind: 'bg-slate-500' },
]

export interface PlanPresentation {
  emoji: string
  colorId: string
}

const DEFAULT: PlanPresentation = { emoji: '📖', colorId: 'brand' }

function load(): Record<string, PlanPresentation> {
  return readJsonStorage<Record<string, PlanPresentation>>(STORAGE_KEY, {}, normalizeAll)
}

export function getPlanPresentation(planId: string): PlanPresentation {
  return load()[planId] ?? { ...DEFAULT }
}

export function setPlanPresentation(planId: string, pref: PlanPresentation): void {
  const safePlanId = planId.trim()
  if (!safePlanId) return

  const all = load()
  all[safePlanId] = normalizePresentation(pref) ?? { ...DEFAULT }
  writeJsonStorage(STORAGE_KEY, all)
}

export function getPlanAccentColor(colorId: string): PlanAccentColor {
  return PLAN_ACCENT_COLORS.find((c) => c.id === colorId) ?? PLAN_ACCENT_COLORS[0]
}

function normalizeAll(value: unknown): Record<string, PlanPresentation> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  return Object.fromEntries(
    Object.entries(value)
      .filter(([planId]) => planId.trim().length > 0)
      .map(([planId, pref]) => [planId.trim(), normalizePresentation(pref)])
      .filter((entry): entry is [string, PlanPresentation] => entry[1] !== null)
  )
}

function normalizePresentation(value: unknown): PlanPresentation | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Partial<PlanPresentation>
  return {
    emoji:
      typeof row.emoji === 'string' && PLAN_EMOJIS.includes(row.emoji) ? row.emoji : DEFAULT.emoji,
    colorId:
      typeof row.colorId === 'string' &&
      PLAN_ACCENT_COLORS.some((color) => color.id === row.colorId)
        ? row.colorId
        : DEFAULT.colorId,
  }
}
