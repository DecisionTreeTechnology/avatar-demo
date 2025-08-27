module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgba(255,255,255,0.06)'
        }
      },
      boxShadow: {
        'xl-glow': '0 0 40px -10px rgba(120,180,255,0.4)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
