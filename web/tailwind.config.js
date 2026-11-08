/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        funtouch: {
          orange: '#FF7A00',
          blue: '#0088FF',
          yellow: '#FFB800',
          cyan: '#00C2FF',
          dark: '#0F172A',
          card: '#1E293B',
        }
      }
    },
  },
  plugins: [],
}

