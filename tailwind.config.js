/** @type {import('tailwindcss').Config} */
// The colour names here are the only ones any component uses. They point at
// the CSS variables in src/app/globals.css — change a value there and every
// page follows. Do not add hex codes to components.
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        linen: 'var(--linen)',
        linen2: 'var(--linen-2)',
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        deep: 'var(--deep)',
        muted: 'var(--muted)',
        olive: 'var(--olive)',
        rose: 'var(--rose)',
        hairline: 'var(--line)',
      },
      borderColor: {
        DEFAULT: 'var(--line)',
      },
      maxWidth: {
        page: '76rem',
      },
    },
  },
  plugins: [],
}
