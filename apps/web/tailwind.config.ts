/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
      colors: {
        accent: '#1a73e8',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        bg: {
          DEFAULT: 'var(--color-bg)',
          subtle: 'var(--color-bg-subtle)',
          surface: 'var(--color-surface)',
        },
        line: 'var(--color-line)',
        brand: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#1a73e8',
          600: '#1557b0',
          700: '#124d9c',
          800: '#0d3d7a',
          900: '#0a3060',
        },
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        'fade-up': 'fadeInUp 0.25s ease forwards',
        'mic-pulse': 'micPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        micPulse: {
          '0%, 100%': { boxShadow: '0 4px 16px rgba(217, 48, 37, 0.35)' },
          '50%': { boxShadow: '0 4px 28px rgba(217, 48, 37, 0.65)' },
        },
      },
    },
  },
  plugins: [],
};
