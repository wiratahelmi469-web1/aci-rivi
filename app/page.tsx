'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, ReceiptText, ShoppingBag } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard, OrderListSkeleton } from '@/components/Skeletons';
import {
  getCustomerOrders,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order } from '@/lib/types';

function getOrderStatusText(order: Order): string {
  if (order.statusBayar === 'Lunas') {
    return order.statusPesanan;
  }
  return order.statusBayar;
}

function getOrderStatusColor(order: Order): string {
  if (order.statusBayar === 'Lunas') {
    return order.statusPesanan === 'Selesai'
      ? 'text-emerald-700'
      : 'text-orange-700';
  }
  if (order.statusBayar === 'Ditolak' || order.statusBayar === 'Kedaluwarsa') {
    return 'text-red-600';
  }
  return 'text-amber-700';
}

export default function HomePage() {
  const router = useRouter();
  const { user, authReady } = useCustomerAuth();
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const loadOrders = useCallback(() => {
    try {
      if (user) {
        setMyOrders(getCustomerOrders(user.uid));
      } else {
        setMyOrders([]);
      }
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
    const unsub = subscribeDataChanges(loadOrders);
    const interval = window.setInterval(loadOrders, 2500);
    return () => {
      window.clearTimeout(initTimer);
      unsub();
      window.clearInterval(interval);
    };
  }, [authReady, loadOrders]);

  const handlePesanSekarang = () => {
    if (!authReady) return;
    if (!user) {
      router.push('/masuk?next=/pesan');
      return;
    }
    router.push('/pesan');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <CustomerHeader />

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

        {/* Tombol/Kartu Utama: Pesan Sekarang */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handlePesanSekarang}
            className="group flex min-h-[180px] w-full flex-col justify-between rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 p-6 text-left text-white shadow-sm transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] sm:p-8"
          >
            <div className="flex w-full items-start justify-between gap-4">
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
                {user
                  ? 'Pilih topping sendiri, tentukan jam ambil, dan bayar lewat QRIS.'
                  : 'Masuk terlebih dahulu untuk mulai meracik seblakmu.'}
              </p>
            </div>
          </button>
        </div>

        {/* Bagian Pesanan Saya (hanya tampil setelah pelanggan login) */}
        {authReady && user && (
          <section
            id="pesanan-saya"
            aria-labelledby="pesanan-saya-heading"
            className="mt-8 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="pesanan-saya-heading"
                className="text-xl font-bold text-stone-900"
              >
                Pesanan Saya
              </h2>
              <span className="text-xs font-medium text-stone-500">
                Terbaru di atas
              </span>
            </div>

            {ordersLoading ? (
              <OrderListSkeleton count={2} />
            ) : ordersError ? (
              <ErrorRetryCard message="Gagal memuat" onRetry={loadOrders} />
            ) : myOrders.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
                <ReceiptText
                  className="mx-auto h-9 w-9 text-stone-300"
                  aria-hidden="true"
                />
                <p className="mt-3 text-base font-semibold text-stone-700">
                  Belum ada pesanan
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Pesanan yang kamu buat akan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/pesanan/${order.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-orange-300 sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span className="font-mono text-lg font-bold text-red-600 tabular-nums">
                          {order.nomorPesanan}
                        </span>
                        <span
                          className={`text-sm font-bold ${getOrderStatusColor(
                            order
                          )}`}
                        >
                          {getOrderStatusText(order)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {formatTanggalJamWib(order.waktuDibuat)} ·{' '}
                        {order.daftarTopping.length} topping
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-base font-bold text-stone-900 tabular-nums">
                          {formatRupiah(order.totalHarga)}
                        </p>
                        {order.statusBayar === 'Menunggu Pembayaran' && (
                          <p className="text-xs font-semibold text-red-600">
                            Lanjut Bayar
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className="h-5 w-5 text-stone-400"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
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
