'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, ShoppingBag } from 'lucide-react';
import { findOrderByQuery, seedInitialToppingsIfNeeded } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();
  const [orderQuery, setOrderQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    seedInitialToppingsIfNeeded();
  }, []);

  const handleCekPesanan = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderQuery.trim();
    if (!trimmed) {
      setSearchError('Masukkan nomor pesanan terlebih dahulu.');
      return;
    }

    const found = findOrderByQuery(trimmed);
    if (!found) {
      setSearchError('Nomor pesanan tidak ditemukan.');
      return;
    }

    setSearchError('');
    router.push(`/pesanan/${found.id}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header khusus pelanggan */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-red-600 whitespace-nowrap"
          >
            Aci Rivi
          </Link>
          <span className="text-xs font-medium text-stone-500">
            Seblak Prasmanan · Ambil di Tempat
          </span>
        </div>
      </header>

      {/* Konten Utama Pelanggan */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl [text-wrap:balance]">
            Pilih Topping Seblak Sendiri, Ambil Tanpa Antre
          </h1>
          <p className="mt-3 text-base leading-relaxed text-stone-600">
            Atur racikan topping favoritmu layaknya prasmanan, tentukan jam
            pengambilan, lalu bayar praktis lewat QRIS.
          </p>
        </div>

        {/* Kartu Utama: Pesan Sekarang */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Link
            href="/pesan"
            className="group flex min-h-[190px] flex-col justify-between rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 p-6 text-white shadow-sm transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] lg:col-span-7 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <ShoppingBag className="h-6 w-6" aria-hidden="true" />
              </div>
              <ArrowRight
                className="h-6 w-6 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold sm:text-3xl">Pesan Sekarang</h2>
              <p className="mt-1.5 text-sm text-orange-50 sm:text-base">
                Pilih topping sendiri, tentukan jam ambil, dan bayar lewat QRIS.
              </p>
            </div>
          </Link>

          {/* Kolom Cek Pesanan */}
          <section
            aria-labelledby="cek-pesanan-heading"
            className="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 lg:col-span-5 sm:p-7"
          >
            <div>
              <h2
                id="cek-pesanan-heading"
                className="text-xl font-bold text-stone-900"
              >
                Cek Pesanan
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Masukkan nomor pesanan untuk melihat status pembayaran atau proses
                pembuatan seblakmu.
              </p>
            </div>

            <form onSubmit={handleCekPesanan} className="mt-6 space-y-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => {
                    setOrderQuery(e.target.value);
                    if (searchError) setSearchError('');
                  }}
                  placeholder="Contoh: 001 atau #001"
                  aria-label="Nomor pesanan"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white pr-4 pl-10 font-mono text-base text-stone-900 placeholder:font-sans placeholder:text-stone-400 focus:border-red-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-bold text-white transition-colors hover:bg-stone-800 active:scale-[0.98]"
              >
                Cek Status Pesanan
              </button>

              {searchError && (
                <p
                  role="alert"
                  className="text-sm font-semibold text-red-600"
                >
                  {searchError}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:px-6">
          <span>Aci Rivi · Seblak Prasmanan</span>
          <span>Buka 10:00 – 21:00 WIB · Hanya pengambilan di tempat</span>
        </div>
      </footer>
    </div>
  );
}
