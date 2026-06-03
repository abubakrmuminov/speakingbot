/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce8ff',
          200: '#b9d1ff',
          300: '#88b0ff',
          400: '#5384ff',
          500: '#2f5ff5',
          600: '#1a3eea',
          700: '#152fd4',
          800: '#1728ab',
          900: '#182887',
        },
        surface: {
          DEFAULT: '#0f0f18',
          card: '#16162a',
          elevated: '#1e1e35',
          border: '#2a2a4a',
        },
      },
      animation: {
        'counter': 'counter 1s ease-out forwards',
        'fade-up': 'fadeUp 0.4s ease-out forwards',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'wave': 'wave 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        wave: {
          '0%': { height: '4px' },
          '100%': { height: '32px' },
        },
      },
    },
  },
  plugins: [],
};
