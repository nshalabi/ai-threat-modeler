/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0a0a0f',
          1: '#12121a',
          2: '#1a1a24',
          3: '#22222e',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        severity: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#3b82f6',
          info: '#6b7280',
        },
      },
    },
  },
  plugins: [],
}
