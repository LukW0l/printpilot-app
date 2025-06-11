// GLOBALNY SYSTEM STYLÓW FORMULARZY - ZAWSZE UŻYWAJ TYCH STYLÓW!
// NIE UŻYWAJ ŻADNYCH bg-gray-*, text-gray-* W FORMULARZACH!

export const formStyles = {
  // Kontenery formularzy
  container: "bg-white rounded-lg shadow-sm border border-gray-200 p-6",
  
  // Nagłówki sekcji
  sectionTitle: "text-lg font-medium text-black mb-4",
  
  // Labele
  label: "block text-sm font-medium text-black mb-2",
  
  // Inputy tekstowe
  input: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black",
  
  // Selecty
  select: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black",
  
  // Textarea
  textarea: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black resize-none",
  
  // Przyciski główne
  primaryButton: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center",
  
  // Przyciski drugorzędne
  secondaryButton: "w-full bg-white border border-gray-300 hover:bg-gray-50 text-black px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center",
  
  // Tekst pomocniczy
  helpText: "text-xs text-black text-center mt-2",
  
  // Debug box
  debugBox: "bg-white border border-gray-300 text-black",
  
  // Nagłówki tabel
  tableHeader: "bg-white border-b border-gray-200",
  
  // Wiersze tabel (hover)
  tableRow: "hover:bg-gray-50 transition-colors",
  
  // Karty/pozycje
  itemCard: "bg-white border border-gray-100 rounded-lg p-4",
  
  // Spacing
  spacing: {
    formElements: "space-y-3", // Między elementami formularza
    sections: "space-y-6",     // Między sekcjami
  }
}

// INSTRUKCJE DLA ASYSTENTA:
// 1. ZAWSZE używaj formStyles zamiast pisać style inline
// 2. NIE UŻYWAJ NIGDY: bg-gray-50, bg-gray-100, text-gray-*, shadow-sm w formularzach
// 3. Wszystkie formularze mają mieć białe tło (bg-white) i czarny tekst (text-black)
// 4. Jedyne dozwolone gray: border-gray-300, border-gray-200, border-gray-100
// 5. Hover states mogą używać hover:bg-gray-50 TYLKO dla interakcji