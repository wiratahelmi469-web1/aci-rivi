import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AuthProvider } from '@/components/AuthProvider';
import { CustomerBottomNav } from '@/components/CustomerBottomNav';
import './globals.css';

const plusJakarta = localFont({
  src: '../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: '../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  weight: '100 800',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aci Rivi — Seblak Prasmanan',
  description:
    'Pesan seblak prasmanan Aci Rivi secara online: pilih topping sendiri, atur waktu pengambilan, bayar QRIS, dan pantau status pesanan.',
  openGraph: {
    title: 'Aci Rivi — Seblak Prasmanan',
    description:
      'Pesan seblak prasmanan Aci Rivi: pilih topping bebas, ambil di tempat tanpa antre.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aci Rivi — Seblak Prasmanan',
    description:
      'Pesan seblak prasmanan Aci Rivi: pilih topping bebas, ambil di tempat tanpa antre.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F7F6F5] font-sans text-stone-900 antialiased selection:bg-orange-100 selection:text-orange-900"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#DC2626',
};

 