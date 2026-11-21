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
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      borderRadius: { xl: '14px', '2xl': '20px' },
    },
  },
  plugins: [],
};

export default config;
