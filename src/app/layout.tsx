import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, DM_Sans, Sora, Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

// Główna czcionka - Plus Jakarta Sans (nowoczesna, czytelna jak w Notion)
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: 'swap',
});

// Czcionka dla nagłówków - Space Grotesk (geometryczna, tech)
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

// Czcionka dla danych/liczb - DM Sans (czytelna w tabelach)
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: 'swap',
});

// Czcionka display - Sora (futurystyczna, jak w Metronic)
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: 'swap',
});

// Fallback - Inter (uniwersalna)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PrintPilot - Order Management Hub",
  description: "Centralized order management for print-on-demand businesses",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%233B82F6'/%3E%3Ctext x='16' y='22' font-family='Arial,sans-serif' font-size='12' font-weight='bold' text-anchor='middle' fill='white'%3EPP%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${sora.variable} ${inter.variable} antialiased`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
