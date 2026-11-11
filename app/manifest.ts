import type { MetadataRoute } from 'next';
import { EVENT } from '@/lib/config';

/** Lets phones "Add to Home Screen" and open the site full screen (the way to go full screen on an iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: EVENT.fullName,
    short_name: EVENT.name,
    start_url: '/me',
    display: 'fullscreen',
    background_color: '#080a07',
    theme_color: '#080a07',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
