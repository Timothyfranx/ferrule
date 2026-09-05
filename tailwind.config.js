/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0a0a0f',
        'bg-raised': '#12121a',
        'bg-panel': '#0c0c12',
        'border-base': '#23232f',
        'border-subtle': '#1a1a24',
        'border-interactive': '#363645',
        'up-green': '#00e676',
        'down-red': '#ff5252',
        'neutral-gray': '#6b6b7a',
        'text-primary': '#f0f0f5',
        'text-secondary': '#9a9aab',
        'text-dim': '#5a5a68',
        'cyan-eval': '#38bdf8',
        'warn-amber': '#ffb300',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
