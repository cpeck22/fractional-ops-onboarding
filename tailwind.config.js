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
        // Tertiary Colors (for charts/infographics - replacing reds/purples)
        'fo-tertiary-1': '#4a90e2',     // Light blue - Tertiary
        'fo-tertiary-2': '#7b68ee',     // Purple-blue - Tertiary
        'fo-tertiary-3': '#48bb78',     // Teal-green - Tertiary
        'fo-tertiary-4': '#ed8936',     // Amber - Tertiary
        // Highlight Legend Colors (matching CEO screenshot)
        'highlight-persona': '#bfdbfe',      // Light blue
        'highlight-segment': '#fde68a',      // Light beige/yellow
        'highlight-outcome': '#bbf7d0',      // Light green
        'highlight-blocker': '#fecdd3',      // Light pink/red
        'highlight-cta': '#fef3c7',          // Light yellow
        'highlight-personalized': '#fed7aa', // Light orange
        // UI Colors for new design (matching Soly App style)
        'fo-sidebar-dark': '#1f2937',   // Dark gray for sidebar (darker, matching examples)
        'fo-bg-light': '#f3f4f6',       // Light gray for main background (matching examples)
        'fo-bg-white': '#ffffff',       // Pure white for cards
        'fo-border': '#e5e7eb',         // Light border color
        'fo-text-muted': '#6b7280',     // Muted text color
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
