'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard, OrderListSkeleton } from '@/components/Skeletons';
import { ToppingImage } from '@/components/ToppingImage';
import { getCustomerOrders, subscribeDataChanges } from '@/lib/storage';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order } from '@/lib/types';

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
  const status = getStatus(order);
  return (
    status.tone === 'wait' ||
    status.tone === 'progress' ||
    order.statusBayar === 'Ditolak'
  );
}

function actionHint(order: Order): string | null {
  if (order.statusBayar === 'Menunggu Pembayaran') return 'Lanjut bayar';
  if (order.statusBayar === 'Ditolak') return 'Unggah ulang bukti';
  return null;
}

function StatusPill({ order }: { order: Order }) {
  const status = getStatus(order);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_CLASS[status.tone]}`}>
      {status.label}
    </span>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  return (
    <Link
      href={`/pesanan/${order.id}`}
      className="block rounded-3xl border border-orange-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xl font-bold text-red-600 tabular-nums">
            {order.nomorPesanan}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Ambil pukul {order.waktuAmbil} · {order.daftarTopping.reduce((sum, item) => sum + (item.quantity ?? 1), 0)} topping
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {order.daftarTopping.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 py-1 pl-1 pr-2 text-xs text-stone-700">
                <ToppingImage
                  src={item.imageUrl}
                  alt={item.nama}
                  sizes="24px"
                  className="h-6 w-6 shrink-0"
                  roundedClassName="rounded-md"
                />
                {item.nama} x{item.quantity ?? 1}
              </span>
            ))}
          </div>
        </div>
        <StatusPill order={order} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`h-1.5 rounded-full ${
              getStatus(order).step >= step ? 'bg-red-600' : 'bg-stone-200'
            }`}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
          {formatRupiah(order.totalHarga)}
        </span>
        {actionHint(order) && (
          <span className="text-sm font-bold text-red-600">
            {actionHint(order)}
          </span>
        )}
      </div>
    </Link>
  );
}

function HistoryOrderCard({ order }: { order: Order }) {
  return (
    <Link
      href={`/pesanan/${order.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-4 transition duration-200 hover:border-orange-300 hover:shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          {formatTanggalJamWib(order.waktuDibuat)}
        </p>
        <StatusPill order={order} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
            {order.nomorPesanan}
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {order.daftarTopping.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 py-1 pl-1 pr-2 text-xs text-stone-700">
                <ToppingImage
                  src={item.imageUrl}
                  alt={item.nama}
                  sizes="24px"
                  className="h-6 w-6 shrink-0"
                  roundedClassName="rounded-md"
                />
                {item.nama} x{item.quantity ?? 1}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-stone-900 tabular-nums">
            {formatRupiah(order.totalHarga)}
          </span>
          <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

export default function PesananPage() {
  const router = useRouter();
  const { user, authReady } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const loadOrders = useCallback(() => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    try {
      setOrders(getCustomerOrders(user.uid));
      setOrdersError(false);
    } catch {
      setOrdersError(true);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authReady && !user) {
      router.replace('/masuk?next=/pesanan');
    }
  }, [authReady, user, router]);

  useEffect(() => {
    if (!authReady || !user) return;
    const initTimer = window.setTimeout(loadOrders, 0);
    const unsubscribe = subscribeDataChanges(loadOrders);
    const interval = window.setInterval(loadOrders, 2500);

    return () => {
      window.clearTimeout(initTimer);
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [authReady, user, loadOrders]);

  const activeOrders = orders.filter(isActive);
  const historyOrders = orders.filter((order) => !isActive(order));

  return (
    <div className="min-h-screen bg-[#F7F6F5] pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
          <div>
            <p className="text-sm font-semibold text-red-600">Aci Rivi</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Pesanan Saya
            </h1>
          </div>
          <Link
            href="/pesan"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            Buat pesanan
          </Link>
        </div>

        {ordersError ? (
          <ErrorRetryCard message="Gagal memuat" onRetry={loadOrders} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
            <section aria-labelledby="pesanan-berlangsung">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2
                  id="pesanan-berlangsung"
                  className="text-xl font-bold text-stone-900"
                >
                  Sedang berlangsung
                </h2>
                {!ordersLoading && activeOrders.length > 0 && (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    {activeOrders.length} aktif
                  </span>
                )}
              </div>

              {ordersLoading ? (
                <OrderListSkeleton count={1} />
              ) : activeOrders.length > 0 ? (
                <ul className="space-y-3">
                  {activeOrders.map((order) => (
                    <li key={order.id}>
                      <ActiveOrderCard order={order} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-7 text-center sm:p-9">
                  <ReceiptText
                    className="mx-auto h-9 w-9 text-stone-300"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-base font-semibold text-stone-800">
                    Tidak ada pesanan yang sedang berlangsung
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Pesanan baru akan muncul di bagian ini.
                  </p>
                </div>
              )}
            </section>

            <section aria-labelledby="riwayat-pesanan">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2
                  id="riwayat-pesanan"
                  className="text-xl font-bold text-stone-900"
                >
                  Riwayat pesanan
                </h2>
                {!ordersLoading && historyOrders.length > 0 && (
                  <span className="text-xs font-medium text-stone-500">
                    {historyOrders.length} pesanan
                  </span>
                )}
              </div>

              {ordersLoading ? (
                <OrderListSkeleton count={2} />
              ) : historyOrders.length > 0 ? (
                <ul className="space-y-3">
                  {historyOrders.map((order) => (
                    <li key={order.id}>
                      <HistoryOrderCard order={order} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-7 text-center sm:p-9">
                  <p className="text-base font-semibold text-stone-800">
                    Belum ada riwayat pesanan
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Pesanan selesai dan pesanan sebelumnya akan tampil di sini.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
