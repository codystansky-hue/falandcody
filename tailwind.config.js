/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bone: 'var(--bone)',
        bone2: 'var(--bone-2)',
        foam: 'var(--foam)',
        ink: 'var(--ink)',
        sea: 'var(--sea)',
        slate2: 'var(--slate)',
        ochre: 'var(--ochre)',
        rust: 'var(--rust)',
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
