/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#E8593C',
          hover: '#D7482B',
          light: '#FDF2F0',
        },
        panel: {
          bg: '#FFFFFF',
          surface: '#F9FAFB',
          border: '#E5E7EB',
        },
        industrial: {
          dark: '#0F172A', // dark blue/gray for the 3D canvas surrounding elements if needed
          light: '#F8FAFC',
          black: '#0A0A0A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
