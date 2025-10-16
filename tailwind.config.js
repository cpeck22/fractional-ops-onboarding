module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors from Fractional Ops Guidelines
        'fo-primary': '#2c6cc3',        // Deep blue - Primary
        'fo-secondary': '#53b1e4',      // Sky blue - Secondary  
        'fo-accent': '#071b37',         // Dark navy - Emphasis
        'fo-orange': '#f6a14a',         // Orange - Highlights/CTAs
        'fo-green': '#16d97d',          // Green - Highlights/CTAs
        'fo-dark': '#171718',           // Dark black - Text
        'fo-light': '#e7e7ec',          // Light gray - Backgrounds
        'fo-text': '#171718',           // Dark black - Primary text
        'fo-text-secondary': '#2d3748', // Secondary text
      },
      fontFamily: {
        'sans': ['Poppins', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
    },
  },
  plugins: [],
}
