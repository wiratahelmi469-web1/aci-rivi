'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, XCircle } from 'lucide-react';
import { OrderStatusTracker } from '@/components/OrderStatusTracker';
import { getOrderById, subscribeDataChanges } from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Order } from '@/lib/types';

function PesananDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get('baru') === '1';

  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    const orderId = params.id;
    const sync = () => {
      setOrder(getOrderById(orderId) ?? null);
    };

    sync();
    const unsubscribe = subscribeDataChanges(sync);
    const interval = window.setInterval(sync, 2000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [params.id]);

  return (
    <div className="min-h-screen bg-[#F7F6F5]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
          <h1 className="text-base font-bold text-stone-900">Status Pesanan</h1>
          <span className="text-sm font-bold text-red-600">Aci Rivi</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {order === undefined ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
            <p className="text-sm text-stone-500">Memuat data pesanan...</p>
          </div>
        ) : order === null ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
            <XCircle
              className="mx-auto h-12 w-12 text-stone-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-xl font-bold text-stone-900">
              Nomor pesanan tidak ditemukan
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Periksa kembali nomor pesanan yang kamu masukkan.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        ) : order.statusBayar === 'Menunggu' ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center sm:p-8">
            <Clock
              className="mx-auto h-12 w-12 text-orange-600"
              aria-hidden="true"
            />
            <p className="mt-3 font-mono text-3xl font-bold text-red-600 tabular-nums">
              {order.nomorPesanan}
            </p>
            <h2 className="mt-2 text-xl font-bold text-stone-900">
              Menunggu Pembayaran QRIS
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Pesanan atas nama <strong>{order.nama}</strong> belum dibayar (
              {formatRupiah(order.totalHarga)}).
            </p>
            <Link
              href="/pesan"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700"
            >
              Buat Pesanan Baru
            </Link>
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
            <OrderStatusTracker order={order} justPaid={justPaid} />
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
        <div className="flex min-h-screen items-center justify-center bg-[#F7F6F5] p-6">
          <p className="text-sm text-stone-500">Memuat status pesanan...</p>
        </div>
      }
    >
      <PesananDetailContent />
    </Suspense>
  );
}
