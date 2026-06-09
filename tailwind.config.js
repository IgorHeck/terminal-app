/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,jsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        // superfícies
        bg: 'var(--bg)',
        'bg-editor': 'var(--bg-editor)',
        'bg-term': 'var(--bg-term)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        rail: 'var(--rail)',
        surface: 'var(--surface)',
        'surface-hi': 'var(--surface-hi)',
        border: 'var(--border)',
        'border-soft': 'var(--border-soft)',
        // texto
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'text-4': 'var(--text-4)',
        // acento (tweakável) — suporta alpha via <alpha-value>
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        // semântica
        green: 'var(--green)',
        red: 'var(--red)',
        yellow: 'var(--yellow)',
        cyan: 'var(--cyan)',
        orange: 'var(--orange)',
        purple: 'var(--purple)'
      },
      borderRadius: {
        token: 'var(--radius)',
        btn: 'var(--radius-btn)'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Cascadia Code', 'monospace'],
        ui: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
