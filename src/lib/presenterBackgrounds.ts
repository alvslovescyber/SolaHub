import type { CSSProperties } from 'vue'
import type { SlideBackground, SlideTextTone } from '@/types/presenter.types'

export const DEFAULT_NOTATION_BACKGROUND: SlideBackground = {
  type: 'gradient',
  value: 'linear-gradient(135deg, #111827 0%, #1f2937 48%, #0f766e 100%)',
  textTone: 'light',
}

export const NOTATION_BACKGROUND_PRESETS = [
  {
    id: 'deep',
    label: 'Deep',
    background: DEFAULT_NOTATION_BACKGROUND,
  },
  {
    id: 'warm',
    label: 'Warm',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #5b2333 0%, #b45309 58%, #f59e0b 100%)',
      textTone: 'light',
    },
  },
  {
    id: 'paper',
    label: 'Paper',
    background: {
      type: 'solid',
      value: '#f8fafc',
      textTone: 'dark',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    background: {
      type: 'solid',
      value: '#020617',
      textTone: 'light',
    },
  },
] as const satisfies readonly {
  id: string
  label: string
  background: SlideBackground
}[]

export function cloneBackground(background: SlideBackground): SlideBackground {
  return { ...background }
}

export function backgroundStyle(background: SlideBackground): CSSProperties {
  if (background.type === 'image') {
    return {
      backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.36), rgba(2, 6, 23, 0.36)), url("${background.value}")`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundColor: '#020617',
    }
  }

  return { background: background.value }
}

export function readableSlideColor(tone: SlideTextTone): string {
  return tone === 'dark' ? '#111827' : '#ffffff'
}

export function mutedSlideColor(tone: SlideTextTone): string {
  return tone === 'dark' ? '#4b5563' : '#cbd5e1'
}

export function normalizeBackground(raw: unknown): SlideBackground {
  if (!raw || typeof raw !== 'object') return cloneBackground(DEFAULT_NOTATION_BACKGROUND)
  const row = raw as Partial<SlideBackground>
  const type = row.type
  const value = typeof row.value === 'string' && row.value.trim() ? row.value.trim() : null
  const textTone = row.textTone === 'dark' ? 'dark' : 'light'

  if (!value || !['preset', 'solid', 'gradient', 'image'].includes(String(type))) {
    return cloneBackground(DEFAULT_NOTATION_BACKGROUND)
  }

  return { type: type as SlideBackground['type'], value, textTone }
}
