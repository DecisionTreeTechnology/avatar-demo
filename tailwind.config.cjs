/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'landscape': {'raw': '(orientation: landscape)'},
        'portrait': {'raw': '(orientation: portrait)'},
        'landscape-short': {'raw': '(orientation: landscape) and (max-height: 500px)'},
        'landscape-xs': {'raw': '(orientation: landscape) and (max-height: 400px)'},
      },
      flexGrow: {
        '2': '2',
        '3': '3',
      }
    },
  },
  plugins: [],
}
