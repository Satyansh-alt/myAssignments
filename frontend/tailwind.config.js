/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#000000',
          900: '#000000',
          800: '#0c0c0f',
          700: '#141418',
          600: '#1c1c22',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          500: '#8b5cf6',
          400: '#a78bfa',
        },
        grade: {
          a: '#34d399',
          b: '#38bdf8',
          c: '#fbbf24',
          d: '#fb923c',
          f: '#f87171',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.18), 0 8px 30px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
