// Centralna konfiguracja kolorów dla całej aplikacji
export const colors = {
  // Kolory tekstu
  text: {
    primary: '#111827',      // Ciemny szary - główny tekst
    secondary: '#4B5563',    // Średni szary - tekst drugorzędny
    tertiary: '#6B7280',     // Jaśniejszy szary - mniej ważny tekst
    disabled: '#9CA3AF',     // Bardzo jasny szary - wyłączony tekst
    white: '#FFFFFF',        // Biały tekst na ciemnych tłach
    danger: '#DC2626',       // Czerwony - błędy
    success: '#059669',      // Zielony - sukces
    warning: '#D97706',      // Pomarańczowy - ostrzeżenia
    info: '#2563EB',         // Niebieski - informacje
  },
  
  // Kolory tła
  background: {
    primary: '#FFFFFF',      // Białe tło
    secondary: '#F9FAFB',    // Bardzo jasno szare tło
    tertiary: '#F3F4F6',     // Jasno szare tło
    hover: '#F9FAFB',        // Tło przy hover
    active: '#E5E7EB',       // Tło aktywnego elementu
    disabled: '#F3F4F6',     // Tło wyłączonego elementu
  },
  
  // Kolory obramowań
  border: {
    primary: '#E5E7EB',      // Główne obramowanie
    secondary: '#D1D5DB',    // Ciemniejsze obramowanie
    focus: '#3B82F6',        // Obramowanie przy focus
    error: '#DC2626',        // Obramowanie błędu
    success: '#059669',      // Obramowanie sukcesu
  },
  
  // Kolory akcji (przyciski, linki)
  action: {
    primary: '#3B82F6',      // Niebieski - główna akcja
    primaryHover: '#2563EB', // Ciemniejszy niebieski
    secondary: '#6B7280',    // Szary - drugorzędna akcja
    secondaryHover: '#4B5563',
    danger: '#DC2626',       // Czerwony - niebezpieczna akcja
    dangerHover: '#B91C1C',
    success: '#059669',      // Zielony - pozytywna akcja
    successHover: '#047857',
  },
  
  // Kolory statusów
  status: {
    info: {
      background: '#DBEAFE',
      text: '#1E40AF',
      border: '#93C5FD',
    },
    success: {
      background: '#D1FAE5',
      text: '#065F46',
      border: '#6EE7B7',
    },
    warning: {
      background: '#FEF3C7',
      text: '#92400E',
      border: '#FCD34D',
    },
    error: {
      background: '#FEE2E2',
      text: '#991B1B',
      border: '#FCA5A5',
    },
  },
}

// Klasy CSS dla formularzy z dobrym kontrastem
export const formStyles = {
  label: 'block text-sm font-medium text-gray-900 mb-2', // Ciemny tekst
  input: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500', // Ciemny tekst
  textarea: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  select: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  checkbox: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
  error: 'text-sm text-red-600 mt-1',
  helper: 'text-xs text-gray-600 mt-1', // Ciemniejszy helper text
}

// Funkcja pomocnicza do uzyskania stylu inputa z opcjonalnym błędem
export const getInputClassName = (hasError?: boolean) => {
  const base = formStyles.input
  if (hasError) {
    return base.replace('border-gray-300', 'border-red-500')
  }
  return base
}

// Eksport domyślnych klas Tailwind z dobrym kontrastem
export const defaultClasses = {
  // Teksty
  'text-primary': 'text-gray-900',
  'text-secondary': 'text-gray-700',
  'text-tertiary': 'text-gray-600',
  'text-muted': 'text-gray-500',
  
  // Inputy i formularze
  'input-base': 'text-gray-900 placeholder-gray-500',
  'input-disabled': 'bg-gray-100 text-gray-600 cursor-not-allowed',
  
  // Przyciski
  'btn-primary': 'bg-blue-600 hover:bg-blue-700 text-white',
  'btn-secondary': 'bg-gray-600 hover:bg-gray-700 text-white',
  'btn-outline': 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  
  // Karty i kontenery
  'card': 'bg-white border border-gray-200 rounded-lg',
  'card-header': 'border-b border-gray-200 px-6 py-4',
  'card-body': 'px-6 py-4',
}