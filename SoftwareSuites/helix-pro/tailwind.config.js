/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:    { DEFAULT: '#020806', deep: '#050810' },
        panel: { 1: '#0a1a14', 2: '#0f2a20', 3: '#163a2c', 4: '#1e4a38' },
        helix: { 1: '#00ff9d', 2: '#5cffbb', 3: '#00cc7a' },
        nuc:   { 1: '#00ccff', 2: '#5cddff', 3: '#0099cc' },
        pro:   { 1: '#b366ff', 2: '#cc99ff', 3: '#8033cc' },
        cell:  { 1: '#ff2e88', 2: '#ff6ba8', 3: '#cc0e6a' },
        enz:   { 1: '#ffbb00', 2: '#ffcc44', 3: '#cc9200' },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
        display: ['Orbitron', 'Chakra Petch', 'sans-serif'],
      },
      animation: {
        gradient: 'gradient 8s ease infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 1.2s cubic-bezier(.2,.8,.2,1) both',
      },
      keyframes: {
        gradient: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
