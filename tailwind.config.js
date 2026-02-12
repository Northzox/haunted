/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        'near-black': '#050505',
        'dark-gray': '#0a0a0a',
        'medium-gray': '#1a1a1a',
        'gray': '#2a2a2a',
        'light-gray': '#3a3a3a',
        'text-primary': '#999999',
        'text-secondary': '#aaaaaa',
        'text-muted': '#666666',
        'accent': '#333333',
        'border': '#1a1a1a',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
