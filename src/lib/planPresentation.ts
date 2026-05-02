const STORAGE_KEY = 'solahub:plan-presentation'

export const PLAN_EMOJIS = [
  '📖', '🙏', '✝️', '🕊️', '🌿', '🌟',
  '🔥', '👑', '⛪', '🎵', '📜', '🌅',
  '💡', '🌊', '🎺', '🕯️',
]

export interface PlanAccentColor {
  id: string
  label: string
  hex: string
  tailwind: string
}

export const PLAN_ACCENT_COLORS: PlanAccentColor[] = [
  { id: 'brand',   label: 'Indigo',  hex: '#3b6bff', tailwind: 'bg-[#3b6bff]' },
  { id: 'emerald', label: 'Emerald', hex: '#059669', tailwind: 'bg-emerald-600' },
  { id: 'amber',   label: 'Amber',   hex: '#d97706', tailwind: 'bg-amber-600' },
  { id: 'rose',    label: 'Rose',    hex: '#e11d48', tailwind: 'bg-rose-600' },
  { id: 'violet',  label: 'Violet',  hex: '#7c3aed', tailwind: 'bg-violet-600' },
  { id: 'slate',   label: 'Slate',   hex: '#475569', tailwind: 'bg-slate-500' },
]

export interface PlanPresentation {
  emoji: string
  colorId: string
}

const DEFAULT: PlanPresentation = { emoji: '📖', colorId: 'brand' }

function load(): Record<string, PlanPresentation> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, PlanPresentation>
  } catch {
    return {}
  }
}

export function getPlanPresentation(planId: string): PlanPresentation {
  return load()[planId] ?? { ...DEFAULT }
}

export function setPlanPresentation(planId: string, pref: PlanPresentation): void {
  const all = load()
  all[planId] = pref
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function getPlanAccentColor(colorId: string): PlanAccentColor {
  return PLAN_ACCENT_COLORS.find((c) => c.id === colorId) ?? PLAN_ACCENT_COLORS[0]
}
