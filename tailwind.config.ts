import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          100: '#dde6ff',
          200: '#c0d0ff',
          300: '#93b0ff',
          400: '#6388ff',
          500: '#3b6bff',
          600: '#2d54e6',
          700: '#2543bf',
          800: '#1f3899',
          900: '#1c3079',
        },
        sun: {
          400: '#f5b347',
          500: '#f08036',
          600: '#d94f5e',
        },
        surface: {
          base: 'var(--s-surface-base)',
          canvas: 'var(--s-surface-canvas)',
          sunken: 'var(--s-surface-sunken)',
          raised: 'var(--s-surface-raised)',
          overlay: 'var(--s-surface-overlay)',
        },
        ink: {
          strong: 'var(--s-text-strong)',
          DEFAULT: 'var(--s-text-default)',
          muted: 'var(--s-text-muted)',
          subtle: 'var(--s-text-subtle)',
          inverse: 'var(--s-text-inverse)',
        },
        line: {
          strong: 'var(--s-border-strong)',
          DEFAULT: 'var(--s-border-default)',
          subtle: 'var(--s-border-subtle)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.05rem' }],
        sm: ['0.8125rem', { lineHeight: '1.15rem' }],
        base: ['0.875rem', { lineHeight: '1.35rem' }],
        md: ['0.9375rem', { lineHeight: '1.4rem' }],
      },
      spacing: {
        sidebar: 'var(--s-sidebar-width)',
        'sidebar-collapsed': 'var(--s-sidebar-collapsed-width)',
        topbar: 'var(--s-topbar-height)',
        rail: 'var(--s-rightrail-width)',
        traffic: 'var(--s-traffic-light-pad)',
      },
      width: {
        sidebar: 'var(--s-sidebar-width)',
        'sidebar-collapsed': 'var(--s-sidebar-collapsed-width)',
        rail: 'var(--s-rightrail-width)',
      },
      borderRadius: {
        xs: 'var(--s-radius-xs)',
        DEFAULT: 'var(--s-radius-sm)',
        md: 'var(--s-radius-md)',
        lg: 'var(--s-radius-lg)',
        xl: 'var(--s-radius-xl)',
      },
      boxShadow: {
        xs: 'var(--s-shadow-xs)',
        sm: 'var(--s-shadow-sm)',
        card: 'var(--s-shadow-card)',
        pop: 'var(--s-shadow-pop)',
        modal: 'var(--s-shadow-modal)',
      },
      ringColor: {
        DEFAULT: 'var(--s-border-focus)',
      },
      zIndex: {
        base: 'var(--s-z-base)',
        dropdown: 'var(--s-z-dropdown)',
        sticky: 'var(--s-z-sticky)',
        modal: 'var(--s-z-modal)',
        toast: 'var(--s-z-toast)',
      },
      animation: {
        'fade-in': 'sFadeIn var(--s-ease-base) both',
        'slide-up': 'sSlideUp var(--s-ease-base) both',
        'pop-in': 'sPopIn 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
      keyframes: {
        sFadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        sSlideUp: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        sPopIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
