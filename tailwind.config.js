/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        border: '#222222',
        'border-bright': '#333333',
        primary: '#dc2626',
        'primary-hover': '#b91c1c',
        'primary-dark': '#7f1d1d',
        'primary-glow': '#ef4444',
        muted: '#6b7280',
        'text-primary': '#f5f5f5',
        'text-secondary': '#9ca3af',
        live: '#f59e0b',
        win: '#22c55e',
        loss: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'red-glow': 'radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, #111111 0%, #1a0a0a 100%)',
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      boxShadow: {
        'red-glow': '0 0 30px rgba(220,38,38,0.3)',
        'red-sm': '0 0 10px rgba(220,38,38,0.2)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
