import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: 'hsl(var(--secondary))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
      },
      fontFamily: {
        body: ['var(--font-body)'],
        displayEn: ['var(--font-display-en)'],
        displayZh: ['var(--font-display-zh)'],
      },
      boxShadow: {
        glass: '0 24px 80px rgba(2, 8, 23, 0.26)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -10px, 0) scale(1.02)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translate3d(0, 24px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
      },
      animation: {
        drift: 'drift 12s ease-in-out infinite',
        rise: 'rise 900ms ease-out both',
      },
    },
  },
  plugins: [],
}

export default config