import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aci Rivi — Seblak Prasmanan',
    short_name: 'Aci Rivi',
    description:
      'Pilih topping seblak sendiri, atur jam ambil, bayar QRIS, dan pantau pesananmu.',
    lang: 'id',
    start_url: '/pesan',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F6F5',
    theme_color: '#DC2626',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}