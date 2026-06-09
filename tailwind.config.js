/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,jsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0c0c0e',
        panel: '#16161a',
        'panel-2': '#1b1b20',
        border: '#26262d',
        accent: '#6366f1'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Cascadia Code', 'monospace'],
        ui: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
