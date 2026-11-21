'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, ShoppingBag, Store } from 'lucide-react';
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
      {/* Header */}
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

      {/* Konten Utama */}
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

        {/* Dua Kartu Besar */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/pesan"
            className="group flex min-h-[168px] flex-col justify-between rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 p-6 text-white shadow-sm transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
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

            <div className="mt-6">
              <h2 className="text-2xl font-bold">Pesan Sekarang</h2>
              <p className="mt-1 text-sm text-orange-50">
                Pilih topping sendiri, tentukan jam ambil, dan bayar QRIS.
              </p>
            </div>
          </Link>

          <Link
            href="/pegawai"
            className="group flex min-h-[168px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 transition-all duration-150 hover:border-orange-300 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
                <Store className="h-6 w-6" aria-hidden="true" />
              </div>
              <ArrowRight
                className="h-6 w-6 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-red-600"
                aria-hidden="true"
              />
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-bold">Masuk Pegawai</h2>
              <p className="mt-1 text-sm text-stone-600">
                Kelola pesanan masuk, stok topping, kasir prasmanan, dan laporan.
              </p>
            </div>
          </Link>
        </div>

        {/* Kolom Kecil Cek Pesanan */}
        <section
          aria-labelledby="cek-pesanan-heading"
          className="mt-8 max-w-xl rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"
        >
          <h2
            id="cek-pesanan-heading"
            className="text-base font-bold text-stone-900"
          >
            Cek Pesanan
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Masukkan nomor pesanan untuk memantau status seblakmu.
          </p>

          <form
            onSubmit={handleCekPesanan}
            className="mt-4 flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
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
              className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-bold text-white transition-colors hover:bg-stone-800 active:scale-[0.98]"
            >
              Cek Status
            </button>
          </form>

          {searchError && (
            <p role="alert" className="mt-2.5 text-sm font-semibold text-red-600">
              {searchError}
            </p>
          )}
        </section>
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
