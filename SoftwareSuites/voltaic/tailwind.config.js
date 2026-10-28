/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:    { DEFAULT: '#070810', deep: '#0a0c18' },
        panel: { 1: '#101426', 2: '#1a2038', 3: '#242c4a', 4: '#333c5e' },
        volt:  { 1: '#ffb84d', 2: '#ffd180', 3: '#cc8f00' },
        grid:  { 1: '#3ad6ff', 2: '#7ce5ff', 3: '#0891b8' },
        load:  { 1: '#ff2e88', 2: '#ff6ba8', 3: '#cc0e6a' },
        renew: { 1: '#10e8a0', 2: '#5cffc0', 3: '#00a870' },
        hydro: { 1: '#a855f7', 2: '#c89aff', 3: '#7c3aed' },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
        display: ['Orbitron', 'Chakra Petch', 'sans-serif'],
      },
      animation: {
        gradient: 'gradient 8s ease infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
