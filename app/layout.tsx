// app/layout.tsx
import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

// Playfair Display — the classic serif of premium/luxury global brands,
// paired with the navy+gold palette sampled from the real logo. Replaces
// the earlier Fraunces choice, which was picked before the real logo
// existed and reads more "artisanal boutique" than "global premium."
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700'],
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
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
