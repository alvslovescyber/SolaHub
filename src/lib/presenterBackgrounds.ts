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
  {
    id: 'aurora-motion',
    label: 'Aurora live',
    background: {
      type: 'motion',
      value:
        'radial-gradient(circle at 22% 28%, rgba(20, 184, 166, 0.58), transparent 34%), radial-gradient(circle at 78% 22%, rgba(245, 158, 11, 0.45), transparent 32%), linear-gradient(135deg, #08111f 0%, #111827 42%, #052e2b 100%)',
      textTone: 'light',
    },
  },
  {
    id: 'soft-radiance',
    label: 'Radiance live',
    background: {
      type: 'motion',
      value:
        'radial-gradient(circle at 48% 42%, rgba(255, 255, 255, 0.2), transparent 18%), radial-gradient(circle at 18% 76%, rgba(59, 130, 246, 0.5), transparent 35%), linear-gradient(135deg, #140f2d 0%, #1f2937 52%, #3f1d38 100%)',
      textTone: 'light',
    },
  },
  {
    id: 'ocean-motion',
    label: 'Ocean live',
    background: {
      type: 'motion',
      value:
        'radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.38), transparent 30%), radial-gradient(circle at 82% 72%, rgba(45, 212, 191, 0.42), transparent 34%), linear-gradient(135deg, #06141f 0%, #0f172a 48%, #134e4a 100%)',
      textTone: 'light',
    },
  },
  {
    id: 'dawn-motion',
    label: 'Dawn live',
    background: {
      type: 'motion',
      value:
        'radial-gradient(circle at 18% 24%, rgba(251, 191, 36, 0.52), transparent 30%), radial-gradient(circle at 78% 30%, rgba(244, 114, 182, 0.34), transparent 32%), linear-gradient(135deg, #21121d 0%, #3b1f2b 48%, #78350f 100%)',
      textTone: 'light',
    },
  },
  {
    id: 'cedar-motion',
    label: 'Cedar live',
    background: {
      type: 'motion',
      value:
        'radial-gradient(circle at 26% 76%, rgba(34, 197, 94, 0.34), transparent 34%), radial-gradient(circle at 78% 18%, rgba(250, 204, 21, 0.28), transparent 30%), linear-gradient(135deg, #08140d 0%, #11221a 50%, #1f2937 100%)',
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

  if (!value || !['preset', 'solid', 'gradient', 'image', 'motion'].includes(String(type))) {
    return cloneBackground(DEFAULT_NOTATION_BACKGROUND)
  }

  return { type: type as SlideBackground['type'], value, textTone }
}
