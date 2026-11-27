'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard } from '@/components/Skeletons';
import { JAM_BUKA, JAM_TUTUP } from '@/lib/constants';
import { formatRupiah } from '@/lib/time';
import { getFirstName } from '@/lib/validation';
import type { Order } from '@/lib/types';
import { PratinjauTopping, type ToppingPreview } from './PratinjauTopping';
import { KartuPesananAktif, PesananAktifKosong, PesananAktifSkeleton } from './KartuPesananAktif';
import { PesananTerakhir } from './PesananTerakhir';
import { StatusToko, useStatusToko } from './StatusToko';

interface BerandaPelangganProps {
  nama: string;
  initialOpen: boolean;
  statusText: string;
  initialActiveOrder: Order | null;
  initialRecentOrders: Order[];
  initialLoadError: boolean;
  bestSellers: ToppingPreview[];
  bestSellersError: boolean;
}

function isActive(order: Order) {
  if (
    order.statusBayar === 'Menunggu Pembayaran' ||
    order.statusBayar === 'Menunggu Konfirmasi' ||
    order.statusBayar === 'Ditolak'
  ) {
    return true;
  }
  return order.statusBayar === 'Lunas' && order.statusPesanan !== 'Selesai';
}

function RingkasanBelanja({ activeOrder }: { activeOrder: Order | null }) {
  if (!activeOrder) return null;
  return (
    <div className="rounded-2xl bg-orange-50/70 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-orange-800">Ringkasan item</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {activeOrder.daftarTopping.map((item) => (
          <span key={item.id} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800">
            {item.nama} x{item.quantity ?? 1}
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-sm font-bold text-stone-900 tabular-nums">
        Total {formatRupiah(activeOrder.totalHarga)}
      </p>
    </div>
  );
}

export function BerandaPelanggan({
  nama,
  initialOpen,
  statusText,
  initialActiveOrder,
  initialRecentOrders,
  initialLoadError,
  bestSellers,
  bestSellersError,
}: BerandaPelangganProps) {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(initialActiveOrder);
  const [recentOrders, setRecentOrders] = useState(initialRecentOrders);
  const [isLoading, setIsLoading] = useState(
    initialLoadError && initialRecentOrders.length === 0 && !initialActiveOrder
  );
  const [loadError, setLoadError] = useState(initialLoadError);
  const [retry, setRetry] = useState(0);
  const firstName = getFirstName(nama);
  const storeStatus = useStatusToko({ open: initialOpen, text: statusText });

  const syncOrders = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/orders', {
      cache: 'no-store',
      signal,
    });
    if (!response.ok) throw new Error('Gagal memuat pesanan.');
    const orders = (await response.json()) as Order[];
    setActiveOrder(orders.find(isActive) ?? null);
    setRecentOrders(orders.slice(0, 3));
    setLoadError(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = () => {
      void syncOrders(controller.signal)
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          if (active) setLoadError(true);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    };
    const initialTimer = window.setTimeout(load, 0);

    const interval = window.setInterval(() => {
      void syncOrders(controller.signal).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (active) setLoadError(true);
      });
    }, 5000);
    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      controller.abort();
      window.clearInterval(interval);
    };
  }, [retry, syncOrders]);

  return (
    <div className="min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <CustomerHeader />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-8 lg:space-y-8 lg:px-8 lg:py-10">
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-600">Beranda pelanggan</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 min-[380px]:text-3xl">
              Hai, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-stone-600">Siap meracik seblak favoritmu hari ini?</p>
          </div>
          <StatusToko status={storeStatus} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="min-w-0">
            {loadError && !isLoading ? (
              <ErrorRetryCard message="Gagal memuat pesanan" onRetry={() => setRetry((value) => value + 1)} />
            ) : isLoading && !activeOrder && recentOrders.length === 0 ? (
              <PesananAktifSkeleton />
            ) : activeOrder ? (
              <KartuPesananAktif order={activeOrder} />
            ) : (
              <PesananAktifKosong storeOpen={storeStatus.open} />
            )}
          </div>
          <aside className="flex flex-col justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Akses cepat</p>
              <h2 className="mt-1 text-lg font-bold text-stone-900">Ambil seblakmu tanpa antre</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                Pesan lebih awal dan datang sesuai waktu pengambilan.
              </p>
            </div>
            <button
              type="button"
              disabled={!storeStatus.open}
              onClick={() => router.push('/pesan')}
              className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 text-center text-base font-extrabold transition ${
                storeStatus.open
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'cursor-not-allowed bg-stone-200 text-stone-500'
              }`}
            >
              {storeStatus.open ? 'Buat Pesanan Baru' : 'Pemesanan tutup'}
              {storeStatus.open && <span aria-hidden="true">→</span>}
            </button>
            {!storeStatus.open && (
              <p className="text-center text-xs font-medium text-stone-500">
                Pesanan online tersedia saat buka, pukul {JAM_BUKA}:00–{JAM_TUTUP}:00 WIB.
              </p>
            )}
          </aside>
        </section>

        {activeOrder && (
          <section aria-label="Ringkasan pesanan aktif" className="lg:hidden">
            <RingkasanBelanja activeOrder={activeOrder} />
          </section>
        )}

        {loadError && (
          <p role="status" className="text-xs text-stone-500">
            Menampilkan data terakhir yang berhasil dimuat.
          </p>
        )}

        <PesananTerakhir orders={recentOrders} isLoading={isLoading && recentOrders.length === 0} />

        <PratinjauTopping
          toppings={bestSellers}
          loadError={bestSellersError}
          href="/pesan"
          title="Topping Terlaris"
          eyebrow="Favorit pelanggan"
          actionLabel="Lihat menu dan mulai racik"
          emptyMessage="Belum ada topping terlaris. Jadilah yang pertama mencoba!"
          errorMessage="Topping terlaris belum dapat dimuat. Coba muat ulang halaman."
        />
      </main>
    </div>
  );
}
