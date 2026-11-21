'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Hourglass, XCircle } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { OrderStatusTracker } from '@/components/OrderStatusTracker';
import { PaymentQrisSection } from '@/components/PaymentQrisSection';
import { ErrorRetryCard, OrderDetailSkeleton } from '@/components/Skeletons';
import { getOrderById, subscribeDataChanges } from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Order } from '@/lib/types';

function PesananDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, authReady } = useCustomerAuth();

  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [justPaidBanner, setJustPaidBanner] = useState(false);
  const prevStatusRef = useRef<Order['statusBayar'] | null>(null);

  useEffect(() => {
    if (authReady && !user) {
      router.replace(`/masuk?next=${encodeURIComponent(`/pesanan/${params.id}`)}`);
    }
  }, [authReady, user, params.id, router]);

  const syncOrder = useCallback(() => {
    try {
      const latest = getOrderById(params.id) ?? null;
      if (latest) {
        if (
          prevStatusRef.current === 'Menunggu Konfirmasi' &&
          latest.statusBayar === 'Lunas'
        ) {
          setJustPaidBanner(true);
        }
        prevStatusRef.current = latest.statusBayar;
      }
      setOrder(latest);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [params.id]);

  useEffect(() => {
    if (!authReady || !user) return;
    const initTimer = window.setTimeout(syncOrder, 0);
    const unsubscribe = subscribeDataChanges(syncOrder);
    const interval = window.setInterval(syncOrder, 2000);

    return () => {
      window.clearTimeout(initTimer);
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [authReady, user, syncOrder]);

  const isUnauthorizedOrder =
    Boolean(order) && Boolean(user) && order?.uid !== user?.uid;

  return (
    <div className="min-h-screen bg-[#F7F6F5]">
      <CustomerHeader />

      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
          <span className="text-sm font-bold text-stone-900">
            Detail Pesanan
          </span>
          <span className="w-16" aria-hidden="true" />
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {!authReady || !user || order === undefined ? (
          <OrderDetailSkeleton />
        ) : loadError ? (
          <ErrorRetryCard message="Gagal memuat" onRetry={syncOrder} />
        ) : order === null || isUnauthorizedOrder ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
            <XCircle
              className="mx-auto h-12 w-12 text-stone-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-xl font-bold text-stone-900">
              Pesanan tidak ditemukan
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {isUnauthorizedOrder
                ? 'Kamu hanya dapat melihat pesanan milik akunmu sendiri.'
                : 'Periksa kembali daftar pesananmu di Beranda.'}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        ) : order.statusBayar === 'Menunggu Pembayaran' ||
          order.statusBayar === 'Ditolak' ? (
          <PaymentQrisSection order={order} />
        ) : order.statusBayar === 'Menunggu Konfirmasi' ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-orange-200 bg-white p-6 text-center shadow-xs sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Hourglass className="h-7 w-7" aria-hidden="true" />
              </div>

              <p className="mt-4 font-mono text-3xl font-bold text-red-600 tabular-nums">
                {order.nomorPesanan}
              </p>

              <h2 className="mt-2 text-xl font-bold text-stone-900">
                Pembayaranmu sedang dicek, biasanya kurang dari beberapa menit
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Halaman ini akan otomatis berubah setelah pegawai mengonfirmasi
                pembayaran sebesar{' '}
                <strong className="font-mono text-stone-900">
                  {formatRupiah(order.totalHarga)}
                </strong>
                .
              </p>

              {order.buktiBayar && (
                <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                  <p className="mb-2 text-xs font-medium text-stone-500">
                    Bukti bayar terkirim
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.buktiBayar}
                    alt="Bukti bayar terkirim"
                    referrerPolicy="no-referrer"
                    className="mx-auto max-h-48 rounded-xl object-contain"
                  />
                </div>
              )}

              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 text-sm font-bold text-stone-700 hover:bg-stone-50"
                >
                  Kembali ke Beranda
                </Link>
              </div>
            </div>
          </div>
        ) : order.statusBayar === 'Kedaluwarsa' ? (
          <div className="rounded-3xl border border-red-200 bg-white p-6 text-center sm:p-8">
            <XCircle
              className="mx-auto h-12 w-12 text-red-500"
              aria-hidden="true"
            />
            <p className="mt-3 font-mono text-3xl font-bold text-stone-500 tabular-nums">
              {order.nomorPesanan}
            </p>
            <h2 className="mt-2 text-xl font-bold text-stone-900">
              Pesanan Kedaluwarsa / Dibatalkan
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Pembayaran tidak diselesaikan tepat waktu atau dibatalkan.
            </p>
            <Link
              href="/pesan"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700"
            >
              Pesan Lagi
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <OrderStatusTracker
              order={order}
              justPaid={
                justPaidBanner ||
                (order.sumber === 'Online' && order.statusPesanan === 'Baru')
              }
            />
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 text-sm font-bold text-stone-700 hover:bg-stone-50"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PesananStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F6F5]">
          <div className="mx-auto max-w-2xl px-4 py-10">
            <OrderDetailSkeleton />
          </div>
        </div>
      }
    >
      <PesananDetailContent />
    </Suspense>
  );
}
