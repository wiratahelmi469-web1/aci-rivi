import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
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
        {children}
      </body>
    </html>
  );
}
