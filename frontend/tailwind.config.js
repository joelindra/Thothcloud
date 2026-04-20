/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        thoth: {
          bg: '#050505',
          card: '#111111',
          primary: '#3b82f6',
          secondary: '#1d4ed8',
          accent: '#60a5fa',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
