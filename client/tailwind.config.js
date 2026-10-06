/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: {
            DEFAULT: '#0F172A',
            sidebar: '#0D1527',
            light: '#1E293B',
            border: '#24334C',
          },
          primary: {
            DEFAULT: '#4F46E5',
            hover: '#4338CA',
            light: '#EEF2FF',
            ring: '#818CF8',
          },
          bg: '#F4F6FA',
          surface: '#FFFFFF',
          border: {
            DEFAULT: '#E2E8F0',
            dashed: '#CBD5E1',
          },
          text: {
            DEFAULT: '#0F172A',
            secondary: '#64748B',
            muted: '#94A3B8',
          },
        },
      },
    },
  },
  plugins: [],
}
