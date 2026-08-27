// app/layout.tsx
import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

// The actual brand typography — this was previously only referenced in CSS
// (var(--font-display)/var(--font-body)) but never loaded, so every browser
// was silently rendering generic system fonts (Georgia/system-ui) instead
// of the real design. next/font/google both loads them and generates the
// matching CSS variables automatically.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GLOBALGETWEST — Natural Herbal Products',
  description: 'Ethically sourced natural herbal products, shipped worldwide.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
