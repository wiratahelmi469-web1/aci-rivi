'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
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

  const title =
    order && !isUnauthorizedOrder ? `Pesanan ${order.nomorPesanan}` : 'Detail pesanan';

  return (
    <div className="min-h-screen bg-[#F7F6F5] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2 sm:px-4">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="truncate text-base font-bold text-stone-900">{title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-6">
        {!authReady || !user || order === undefined ? (
          <OrderDetailSkeleton />
        ) : loadError ? (
          <ErrorRetryCard message="Gagal memuat" onRetry={syncOrder} />
        ) : order === null || isUnauthorizedOrder ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-stone-400" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-bold text-stone-900">
              Pesanan tidak ditemukan
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {isUnauthorizedOrder
                ? 'Kamu hanya bisa melihat pesanan dari akunmu sendiri.'
                : 'Cek daftar pesananmu di Beranda.'}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white transition-colors hover:bg-red-700 active:bg-red-800"
            >
              Ke beranda
            </Link>
          </div>
        ) : order.statusBayar === 'Menunggu Pembayaran' ||
          order.statusBayar === 'Ditolak' ? (
          <PaymentQrisSection order={order} />
        ) : order.statusBayar === 'Menunggu Konfirmasi' ? (
          <div className="rounded-3xl border border-orange-200 bg-white p-6 text-center sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3.5 py-1.5 text-sm font-bold text-orange-800">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
              </span>
              Menunggu konfirmasi pegawai
            </span>

            <p className="mt-5 font-mono text-4xl font-bold text-red-600 tabular-nums">
              {order.nomorPesanan}
            </p>

            <h2 className="mt-3 text-xl font-bold text-stone-900">
              Pembayaran sedang dicek
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
              Biasanya hanya beberapa menit. Halaman ini berubah sendiri setelah
              pembayaran{' '}
              <strong className="font-mono text-stone-900">
                {formatRupiah(order.totalHarga)}
              </strong>{' '}
              dikonfirmasi.
            </p>

            {order.buktiBayar && (
              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <p className="mb-2 text-xs font-medium text-stone-500">
                  Bukti bayar yang kamu kirim
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.buktiBayar}
                  alt="Bukti bayar yang kamu kirim"
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-48 rounded-xl object-contain"
                />
              </div>
            )}

            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 active:bg-stone-100"
            >
              Ke beranda
            </Link>
          </div>
        ) : order.statusBayar === 'Kedaluwarsa' ? (
          <div className="rounded-3xl border border-red-200 bg-white p-6 text-center sm:p-8">
            <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
            <p className="mt-3 font-mono text-3xl font-bold text-stone-400 tabular-nums">
              {order.nomorPesanan}
            </p>
            <h2 className="mt-2 text-xl font-bold text-stone-900">Pesanan dibatalkan</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
              Pembayaran tidak selesai dalam batas waktu, jadi pesanan ini tidak
              diproses. Kamu bisa membuat pesanan baru kapan saja.
            </p>
            <Link
              href="/pesan"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white transition-colors hover:bg-red-700 active:bg-red-800"
            >
              Pesan lagi
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
                className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 active:bg-stone-100"
              >
                Ke beranda
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