import { theme, getTextClass, getStatusClasses, getButtonClasses } from '@/styles/theme'

export const useTheme = () => {
  return {
    theme,
    getTextClass,
    getStatusClasses,
    getButtonClasses,
    
    // Convenience classes for common patterns
    classes: {
      // Text variations
      heading: `${theme.typography.h3} ${getTextClass('primary')}`,
      label: `${theme.typography.label} ${getTextClass('secondary')}`,
      body: `${theme.typography.body} ${getTextClass('primary')}`,
      caption: `${theme.typography.caption} ${getTextClass('secondary')}`,
      muted: `${theme.typography.body} ${getTextClass('muted')}`,
      
      // Common components
      card: theme.components.card,
      input: theme.components.input,
      primaryButton: theme.components.button.primary,
      secondaryButton: theme.components.button.secondary,
      
      // Layout helpers
      section: 'space-y-6',
      grid: 'grid grid-cols-1 gap-6',
      flexBetween: 'flex items-center justify-between',
      flexStart: 'flex items-center space-x-3',
    }
  }
}

// Utility function to combine classes safely
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}