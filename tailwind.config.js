/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1C2430',
        paper: '#F6F8FA',
        panel: '#FFFFFF',
        line: '#E2E7ED',
        muted: '#6B7686',
        coral: '#FF6B4A',
        teal: '#1F9E8E',
        indigo: '#4A5CFF',
        amber: '#F5A623',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
};
