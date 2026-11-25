'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard, OrderListSkeleton } from '@/components/Skeletons';
import { JAM_BUKA, JAM_TUTUP } from '@/lib/constants';
import {
  getCustomerOrders,
  getToppings,
  loadToppings,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order, Topping } from '@/lib/types';
import { getFirstName } from '@/lib/validation';

type Tone = 'wait' | 'bad' | 'progress' | 'done';

const TONE_CLASS: Record<Tone, string> = {
  wait: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-700',
  progress: 'bg-orange-100 text-orange-800',
  done: 'bg-emerald-100 text-emerald-800',
};

function getStatus(order: Order): { label: string; tone: Tone; step: number } {
  switch (order.statusBayar) {
    case 'Menunggu Pembayaran':
      return { label: 'Menunggu pembayaran', tone: 'wait', step: 0 };
    case 'Menunggu Konfirmasi':
      return { label: 'Dicek pegawai', tone: 'wait', step: 1 };
    case 'Ditolak':
      return { label: 'Bukti ditolak', tone: 'bad', step: 0 };
    case 'Kedaluwarsa':
      return { label: 'Kedaluwarsa', tone: 'bad', step: 0 };
    default:
      if (order.statusPesanan === 'Selesai')
        return { label: 'Selesai', tone: 'done', step: 4 };
      if (order.statusPesanan === 'Siap Diambil')
        return { label: 'Siap diambil', tone: 'progress', step: 4 };
      if (order.statusPesanan === 'Sedang Dibuat')
        return { label: 'Sedang dibuat', tone: 'progress', step: 3 };
      return { label: 'Pesanan diterima', tone: 'progress', step: 2 };
  }
}

function isActive(order: Order): boolean {
  const s = getStatus(order);
  return s.tone === 'wait' || s.tone === 'progress' || order.statusBayar === 'Ditolak';
}

function actionHint(order: Order): string | null {
  if (order.statusBayar === 'Menunggu Pembayaran') return 'Lanjut bayar';
  if (order.statusBayar === 'Ditolak') return 'Unggah ulang bukti';
  return null;
}

function StatusPill({ order }: { order: Order }) {
  const s = getStatus(order);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_CLASS[s.tone]}`}>
      {s.label}
    </span>
  );
}

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

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [toppings, setToppings] = useState<Topping[]>([]);

  const loadOrders = useCallback(() => {
    try {
      setMyOrders(user ? getCustomerOrders(user.uid) : []);
      setOrdersError(false);
    } catch {
      setOrdersError(true);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authReady) return;
    const initTimer = window.setTimeout(loadOrders, 0);
    void loadToppings().then(setToppings).catch(() => {});
    const unsub = subscribeDataChanges(() => {
      loadOrders();
      setToppings(getToppings());
    });
    const interval = window.setInterval(loadOrders, 2500);
    return () => {
      window.clearTimeout(initTimer);
      unsub();
      window.clearInterval(interval);
    };
  }, [authReady, loadOrders]);

  const handlePesan = () => {
    if (!authReady) return;
    router.push(user ? '/pesan' : '/masuk?next=/pesan');
  };

  const activeOrder = myOrders.find(isActive);
  const otherOrders = myOrders.filter((o) => o.id !== activeOrder?.id);
  const firstName = getFirstName(profile?.nama || user?.displayName);

  return (
    <div className="flex min-h-screen flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero: aksi utama */}
        <section>
          <button
            type="button"
            onClick={handlePesan}
            className="relative block w-full overflow-hidden rounded-[28px] bg-red-600 p-6 text-left text-white transition-transform active:scale-[0.99] sm:p-9"
          >
            <BowlArt className="pointer-events-none absolute -right-8 -bottom-10 h-48 w-48 text-white/15 sm:h-64 sm:w-64" />

            <div className="relative max-w-md">
              {store && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      store.open ? 'bg-emerald-300' : 'bg-amber-300'
                    }`}
                    aria-hidden="true"
                  />
                  {store.text}
                </span>
              )}

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl">
                {user ? `Mau seblak apa, ${firstName}?` : 'Racik seblakmu sendiri'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-red-50 sm:text-base">
                Pilih topping seperti di prasmanan, tentukan jam ambil, lalu bayar lewat QRIS.
              </p>

              <span className="mt-6 inline-flex min-h-[48px] items-center rounded-2xl bg-white px-6 text-base font-bold text-red-600">
                {user ? 'Mulai racik' : 'Masuk untuk memesan'}
              </span>
            </div>
          </button>
        </section>

        {/* Pesanan aktif */}
        {authReady && user && activeOrder && (
          <section aria-labelledby="pesanan-aktif">
            <h2 id="pesanan-aktif" className="text-lg font-bold text-stone-900">
              Pesanan berjalan
            </h2>
            <Link
              href={`/pesanan/${activeOrder.id}`}
              className="mt-3 block rounded-3xl border border-orange-200 bg-white p-5 transition-colors hover:border-orange-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-2xl font-bold text-red-600 tabular-nums">
                    {activeOrder.nomorPesanan}
                  </p>
                  <p className="mt-0.5 text-sm text-stone-600">
                    Ambil pukul {activeOrder.waktuAmbil} · {activeOrder.daftarTopping.length} topping
                  </p>
                </div>
                <StatusPill order={activeOrder} />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 rounded-full ${
                      getStatus(activeOrder).step >= n ? 'bg-red-600' : 'bg-stone-200'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
                  {formatRupiah(activeOrder.totalHarga)}
                </span>
                {actionHint(activeOrder) && (
                  <span className="text-sm font-bold text-red-600">{actionHint(activeOrder)}</span>
                )}
              </div>
            </Link>
          </section>
        )}

        {/* Etalase topping */}
        {toppings.length > 0 && (
          <section aria-labelledby="etalase">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="etalase" className="text-lg font-bold text-stone-900">
                Topping hari ini
              </h2>
              <button
                type="button"
                onClick={handlePesan}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Lihat semua
              </button>
            </div>

            <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {toppings.map((t) => {
                const habis = !t.tersedia || t.stok <= 0;
                return (
                  <li
                    key={t.id}
                    className={`w-28 shrink-0 snap-start rounded-2xl border border-stone-200 bg-white p-2 ${
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

        {/* Riwayat pesanan */}
        {authReady && user && (
          <section id="pesanan-saya" aria-labelledby="pesanan-saya-heading" className="space-y-3">
            <h2 id="pesanan-saya-heading" className="text-lg font-bold text-stone-900">
              Riwayat pesanan
            </h2>

            {ordersLoading ? (
              <OrderListSkeleton count={2} />
            ) : ordersError ? (
              <ErrorRetryCard message="Gagal memuat" onRetry={loadOrders} />
            ) : myOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <ReceiptText className="mx-auto h-8 w-8 text-stone-300" aria-hidden="true" />
                <p className="mt-3 text-base font-semibold text-stone-700">Belum ada pesanan</p>
                <p className="mt-1 text-sm text-stone-500">
                  Pesanan yang kamu buat akan muncul di sini.
                </p>
              </div>
            ) : otherOrders.length === 0 ? (
              <p className="text-sm text-stone-500">Belum ada pesanan lain.</p>
            ) : (
              <ul className="space-y-2.5">
                {otherOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/pesanan/${order.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-orange-300"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
                            {order.nomorPesanan}
                          </span>
                          <StatusPill order={order} />
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {formatTanggalJamWib(order.waktuDibuat)} · {order.daftarTopping.length} topping
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-sm font-bold text-stone-900 tabular-nums">
                          {formatRupiah(order.totalHarga)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:px-6">
          <span>Aci Rivi, seblak prasmanan</span>
          <span>Buka {JAM_BUKA}:00 sampai {JAM_TUTUP}:00 WIB, hanya ambil di tempat</span>
        </div>
      </footer>
    </div>
  );
}