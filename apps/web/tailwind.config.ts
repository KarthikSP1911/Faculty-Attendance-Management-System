import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--primary-hover) / <alpha-value>)',
        'primary-fg': 'rgb(var(--primary-fg) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        st: {
          present: 'rgb(var(--st-present) / <alpha-value>)',
          late: 'rgb(var(--st-late) / <alpha-value>)',
          half: 'rgb(var(--st-half) / <alpha-value>)',
          absent: 'rgb(var(--st-absent) / <alpha-value>)',
          leave: 'rgb(var(--st-leave) / <alpha-value>)',
          holiday: 'rgb(var(--st-holiday) / <alpha-value>)',
          off: 'rgb(var(--st-off) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-text)', 'Segoe UI', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-text)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-in': 'fade-in 150ms ease-out', 'slide-up': 'slide-up 200ms ease-out' },
      borderRadius: { lg: '6px', xl: '6px', '2xl': '8px' },
    },
  },
  plugins: [],
};

export default config;
