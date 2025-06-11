// Global theme configuration for PrintPilot
export const theme = {
  colors: {
    // Text colors - highly readable on white backgrounds
    text: {
      primary: 'text-gray-900',      // Main text - dark and readable
      secondary: 'text-gray-700',    // Secondary text - still readable
      muted: 'text-gray-600',        // Muted text - minimum readable contrast
      placeholder: 'text-gray-500',  // Placeholders only
      disabled: 'text-gray-400',     // Disabled elements only
      inverse: 'text-white',         // Text on dark backgrounds
    },
    
    // Background colors
    background: {
      primary: 'bg-white',
      secondary: 'bg-gray-50',
      tertiary: 'bg-gray-100',
      dark: 'bg-gray-900',
    },
    
    // Border colors
    border: {
      light: 'border-gray-200',
      medium: 'border-gray-300',
      dark: 'border-gray-400',
    },
    
    // Status colors
    status: {
      success: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
      },
      warning: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      },
      error: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
      },
      info: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      },
    },
    
    // Button colors
    button: {
      primary: {
        bg: 'bg-gradient-to-r from-indigo-600 to-purple-600',
        hoverBg: 'hover:from-indigo-700 hover:to-purple-700',
        text: 'text-white',
      },
      secondary: {
        bg: 'bg-white',
        hoverBg: 'hover:bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
        hoverBorder: 'hover:border-gray-300',
      },
    },
  },
  
  // Typography scale
  typography: {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-lg font-bold',
    h4: 'text-base font-semibold',
    body: 'text-sm',
    caption: 'text-xs',
    label: 'text-sm font-medium',
  },
  
  // Spacing scale
  spacing: {
    xs: 'p-2',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  },
  
  // Component-specific styles
  components: {
    card: `bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300`,
    input: `block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`,
    label: `block text-sm font-medium text-gray-700 mb-1`,
    button: {
      primary: `inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`,
      secondary: `inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md`,
    },
  },
} as const

// Utility functions for theme usage
export const getTextClass = (variant: keyof typeof theme.colors.text = 'primary') => {
  return theme.colors.text[variant]
}

export const getStatusClasses = (status: keyof typeof theme.colors.status) => {
  return theme.colors.status[status]
}

export const getButtonClasses = (variant: keyof typeof theme.components.button = 'primary') => {
  return theme.components.button[variant]
}

// CSS variables for dynamic theming (future use)
export const cssVariables = {
  '--color-text-primary': '#111827',      // gray-900
  '--color-text-secondary': '#374151',    // gray-700
  '--color-text-muted': '#4B5563',        // gray-600
  '--color-background-primary': '#FFFFFF',
  '--color-background-secondary': '#F9FAFB', // gray-50
  '--color-border-light': '#E5E7EB',      // gray-200
  '--color-border-medium': '#D1D5DB',     // gray-300
}