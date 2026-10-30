/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#5865F2',
          variant: '#4752C4',
          secondary: '#8B5CF6',
          accent: '#06B6D4',
          seen: '#34B7F1',
        },
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          border: '#334155',
          text: '#F8FAFC',
          muted: '#94A3B8',
        }
      },
      borderRadius: {
        '28': '28px',
        '24': '24px',
      }
    },
  },
  plugins: [],
}
