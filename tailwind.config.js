import { noctuaColors } from './src/@noctua.core/theme/theme'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: noctuaColors.noctuadark,
        accent: noctuaColors.noctuaAccent,
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.5rem', { lineHeight: '0.625rem' }],
      },
    },
  },
  plugins: [],
}
