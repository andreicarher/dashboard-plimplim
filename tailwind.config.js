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
        paper: '#FFF8E1',
        panel: '#FFFFFF',
        line: '#F5D061',
        muted: '#8A6D1F',
        plimYellow: '#FDC500',
        plimOrange: '#F7941D',
        plimBlue: '#2E86DE',
        plimBlueDark: '#1B4F91',
        plimRed: '#ED1C24',
        plimCream: '#FFF3C4',
        coral: '#ED1C24',
        teal: '#1F9E8E',
        indigo: '#2E86DE',
        amber: '#F7941D',
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
