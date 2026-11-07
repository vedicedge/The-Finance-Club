import type { Metadata, Viewport } from 'next';
import { Cinzel, Cinzel_Decorative, Cormorant_Garamond, Inter } from 'next/font/google';
import { EVENT } from '@/lib/config';
import './globals.css';

// The poster's type, self-hosted by Next at build time (no runtime request to Google):
// Cinzel for titles, Cinzel Decorative for the flourished wordmark, Cormorant for long-form
// serif and italics, Inter for UI and every number.
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-cinzel',
  display: 'swap',
});
const cinzelDeco = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-cinzel-deco',
  display: 'swap',
  preload: false,
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin', 'latin-ext'], // latin-ext carries the ₹ sign
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: `${EVENT.name} — ${EVENT.club}`, template: `%s · ${EVENT.name}` },
  description: `${EVENT.villain} has announced a doomsday attack on ${EVENT.city}. Hero agencies race to fund, build and save the city.`,
  robots: { index: false, follow: false },
  openGraph: {
    title: `${EVENT.name} — ${EVENT.club}`,
    description: `${EVENT.tagline} 25 November 2026.`,
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080a07',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cinzel.variable} ${cinzelDeco.variable} ${cormorant.variable} ${inter.variable}`}>
      <body className="grain antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
