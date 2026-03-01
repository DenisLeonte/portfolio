/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#16a34a',
          secondary: '#15803d',
          muted: '#22c55e',
          dim: '#dcfce7',
          glow: 'rgba(22, 163, 74, 0.1)',
        },
        bg: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          card: 'rgba(22, 163, 74, 0.04)',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(22, 163, 74, 0.2)',
        'glow': '0 0 20px rgba(22, 163, 74, 0.25)',
        'glow-lg': '0 0 40px rgba(22, 163, 74, 0.3)',
        'glow-xl': '0 0 60px rgba(22, 163, 74, 0.2)',
        'card': '0 4px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(22, 163, 74, 0.05)',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(22, 163, 74, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(22, 163, 74, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
