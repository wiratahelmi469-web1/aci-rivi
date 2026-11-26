'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard } from '@/components/Skeletons';
import { JAM_BUKA, JAM_TUTUP } from '@/lib/constants';
import {
  getToppings,
  loadToppings,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Topping } from '@/lib/types';
import { getFirstName } from '@/lib/validation';

function BowlArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20 100H180A80 80 0 0 1 20 100Z" />
      <rect x="68" y="176" width="64" height="12" rx="6" />
      <path
        d="M70 76c-9-11 9-17 0-30M100 76c-9-11 9-17 0-30M130 76c-9-11 9-17 0-30"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function useStoreStatus() {
  const [state, setState] = useState<{ open: boolean; text: string } | null>(null);

  useEffect(() => {
    const compute = () => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false,
      }).formatToParts(new Date());
      const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
      const open = hour >= JAM_BUKA && hour < JAM_TUTUP;
      setState({
        open,
        text: open
          ? `Buka sampai ${JAM_TUTUP}:00 WIB`
          : hour < JAM_BUKA
            ? `Buka pukul ${JAM_BUKA}:00 WIB`
            : `Tutup, buka lagi besok pukul ${JAM_BUKA}:00 WIB`,
      });
    };
    compute();
    const timer = window.setInterval(compute, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return state;
}

export default function HomePage() {
  const router = useRouter();
  const { user, profile, authReady } = useCustomerAuth();
  const store = useStoreStatus();

  const [toppings, setToppings] = useState<Topping[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<string[]>([]);
  const [toppingsError, setToppingsError] = useState('');

  const loadHomepageToppings = useCallback(async () => {
    setToppingsError('');
    try {
      setToppings(await loadToppings());

      const res = await fetch('/api/toppings/best-sellers', {
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        toppingIds?: unknown;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat topping terlaris.');
      }
      if (
        !Array.isArray(data.toppingIds) ||
        !data.toppingIds.every((id): id is string => typeof id === 'string')
      ) {
        throw new Error('Data topping terlaris tidak valid.');
      }
      setBestSellerIds(data.toppingIds);
    } catch (err) {
      setToppingsError(
        err instanceof Error ? err.message : 'Gagal memuat topping terlaris.'
      );
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const initTimer = window.setTimeout(() => {
      void loadHomepageToppings();
    }, 0);
    const unsub = subscribeDataChanges(() => {
      setToppings(getToppings());
    });
    return () => {
      window.clearTimeout(initTimer);
      unsub();
    };
  }, [authReady, loadHomepageToppings]);

  const handlePesan = () => {
    if (!authReady) return;
    router.push(user ? '/pesan' : '/masuk?next=/pesan');
  };

  const firstName = getFirstName(profile?.nama || user?.displayName);
  const featuredToppings =
    bestSellerIds.length > 0
      ? bestSellerIds
          .map((id) => toppings.find((topping) => topping.id === id))
          .filter((topping): topping is Topping => topping !== undefined)
      : toppings;

  return (
    <div className="flex min-h-screen flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-10 lg:px-8 lg:py-10">
        {/* Hero: aksi utama */}
        <section className="-mx-4 lg:hidden">
          <button
            type="button"
            onClick={handlePesan}
            className="relative block w-full overflow-hidden rounded-b-[28px] bg-red-600 p-5 text-left text-white transition-transform active:scale-[0.99] sm:rounded-[28px] sm:p-6"
          >
            <BowlArt className="pointer-events-none absolute -right-8 -bottom-10 h-40 w-40 text-white/15 sm:h-48 sm:w-48" />

            <div className="relative max-w-md">
              <p className="text-sm leading-relaxed text-red-50 sm:text-base">
                Pilih topping seperti di prasmanan, tentukan jam ambil, lalu bayar lewat QRIS.
              </p>

              <span className="mt-5 inline-flex min-h-[48px] items-center rounded-2xl bg-white px-6 text-base font-bold text-red-600">
                {user ? 'Mulai racik' : 'Masuk untuk memesan'}
              </span>
            </div>
          </button>
        </section>

        <section
          aria-labelledby="sapaan"
          className="flex flex-col items-start gap-3 rounded-3xl bg-red-600 p-4 text-white min-[500px]:flex-row min-[500px]:items-center lg:hidden"
        >
          <h1 id="sapaan" className="w-full min-w-0 text-3xl font-extrabold tracking-tight [text-wrap:balance] min-[500px]:w-auto min-[500px]:flex-1 sm:text-4xl">
            {user ? `Mau seblak apa, ${firstName}?` : 'Racik seblakmu sendiri'}
          </h1>
          {store && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <span
                className={`h-2 w-2 rounded-full ${
                  store.open ? 'bg-emerald-300' : 'bg-amber-300'
                }`}
                aria-hidden="true"
              />
              {store.text}
            </span>
          )}
        </section>

        <section className="hidden overflow-hidden rounded-[32px] bg-red-600 text-white shadow-sm lg:grid lg:min-h-[360px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col items-start justify-center px-10 py-12 xl:px-14">
            {store && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    store.open ? 'bg-emerald-300' : 'bg-amber-300'
                  }`}
                  aria-hidden="true"
                />
                {store.text}
              </span>
            )}
            <h1 className="mt-5 max-w-xl text-5xl font-extrabold tracking-tight [text-wrap:balance] xl:text-6xl">
              Racik seblakmu sendiri
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-red-50">
              Pilih topping seperti di prasmanan, tentukan jam ambil, lalu bayar lewat QRIS.
            </p>
            <button
              type="button"
              onClick={handlePesan}
              className="mt-7 inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-7 text-base font-bold text-red-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              Mulai Pesan
            </button>
          </div>
          <div className="relative flex items-center justify-center overflow-hidden">
            <span className="absolute h-[min(26rem,85%)] aspect-square rounded-full bg-white/10" aria-hidden="true" />
            <BowlArt className="relative h-72 w-72 text-white/90 xl:h-80 xl:w-80" />
          </div>
        </section>

        {/* Etalase topping */}
        {toppingsError ? (
          <section aria-labelledby="etalase">
            <h2 id="etalase" className="mb-3 text-lg font-bold text-stone-900">
              Topping terlaris
            </h2>
            <ErrorRetryCard
              message={toppingsError}
              onRetry={() => void loadHomepageToppings()}
            />
          </section>
        ) : featuredToppings.length > 0 && (
          <section aria-labelledby="etalase">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="etalase" className="text-lg font-bold text-stone-900">
                {bestSellerIds.length > 0 ? 'Topping terlaris' : 'Topping hari ini'}
              </h2>
              <button
                type="button"
                onClick={handlePesan}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Lihat semua
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {featuredToppings.map((t) => {
                const habis = !t.tersedia || t.stok <= 0;
                return (
                  <li
                    key={t.id}
                    className={`min-w-0 rounded-2xl border border-stone-200 bg-white p-2 transition duration-200 hover:-translate-y-1 hover:shadow-md lg:p-3 ${
                      habis ? 'opacity-60' : ''
                    }`}
                  >
                    <div
                      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-orange-50 ${
                        habis ? 'grayscale' : ''
                      }`}
                    >
                      {t.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.foto}
                          alt={t.nama}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl" aria-hidden="true">
                          {t.emoji}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-stone-900">{t.nama}</p>
                    <p className="font-mono text-xs font-semibold text-orange-700 tabular-nums">
                      {habis ? 'Habis' : formatRupiah(t.harga)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:px-6 lg:px-8">
          <span>Aci Rivi, seblak prasmanan</span>
          <span>Buka {JAM_BUKA}:00 sampai {JAM_TUTUP}:00 WIB, hanya ambil di tempat</span>
        </div>
      </footer>
    </div>
  );
}