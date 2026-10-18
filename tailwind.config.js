/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sigma: {
          bg: '#0F1014',
          card: '#1E1E2D',
          cardHover: '#232336',
          border: '#2B2B40',
          darker: '#151521',
          primary: '#009EF7',
          primaryHover: '#0086D1',
          success: '#50CD89',
          warning: '#FFC700',
          danger: '#F1416C',
          info: '#7239EA',
          cyan: '#00D2FF',
          text: '#FFFFFF',
          textMuted: '#92929F',
          textSub: '#6D6D80'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
