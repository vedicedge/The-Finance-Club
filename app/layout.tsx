import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, Pinyon_Script } from 'next/font/google';
import { EVENT } from '@/lib/config';
import './globals.css';

// Same families as the Section E site, self-hosted by Next at build time (no runtime request
// to Google). Heavier Cormorant weights than Section E so titles hold up on a projector.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin', 'latin-ext'], // latin-ext carries the ₹ sign
  variable: '--font-inter',
  display: 'swap',
});
const pinyon = Pinyon_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pinyon',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: { default: `${EVENT.name} — ${EVENT.club}`, template: `%s · ${EVENT.name}` },
  description: `${EVENT.villain} has announced a doomsday attack on ${EVENT.city}. Hero agencies race to fund, build and save the city.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050807',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${inter.variable} ${pinyon.variable}`}>
      <body className="grain antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
