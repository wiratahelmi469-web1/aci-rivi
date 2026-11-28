'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Maximize2,
  Receipt,
  X,
  XCircle,
} from 'lucide-react';
import { ErrorRetryCard, OrderListSkeleton } from '@/components/Skeletons';
import { ToppingImage } from '@/components/ToppingImage';
import {
  konfirmasiPembayaranPegawai,
  tolakPembayaranPegawai,
} from '@/lib/payment';
import { getPendingPaymentOrders, subscribeDataChanges } from '@/lib/storage';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order } from '@/lib/types';

const ALASAN_CEPAT = [
  'Nominal tidak sesuai',
  'Bukti bayar buram / tidak terbaca',
  'Transfer bukan ke QRIS Aci Rivi',
];

export function CekPembayaranView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [zoomProofUrl, setZoomProofUrl] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const sync = useCallback(() => {
    try {
      setOrders(getPendingPaymentOrders());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(sync, 0);
    const unsub = subscribeDataChanges(sync);
    const interval = window.setInterval(sync, 2500);
    return () => {
      window.clearTimeout(initTimer);
      unsub();
      window.clearInterval(interval);
    };
  }, [sync]);

  const handleConfirm = async (order: Order) => {
    setActionErrors((prev) => ({ ...prev, [order.id]: '' }));
    const res = await konfirmasiPembayaranPegawai(order.id);
    if (!res.sukses) {
      setActionErrors((prev) => ({ ...prev, [order.id]: res.pesan }));
    }
  };

  const handleRejectSubmit = async (orderId: string) => {
    const res = await tolakPembayaranPegawai(orderId, rejectReason);
    if (!res.sukses) {
      setActionErrors((prev) => ({ ...prev, [orderId]: res.pesan }));
      return;
    }
    setRejectingId(null);
    setRejectReason('');
    setActionErrors((prev) => ({ ...prev, [orderId]: '' }));
  };

  if (isLoading) {
    return <OrderListSkeleton count={3} />;
  }

  if (loadError) {
    return <ErrorRetryCard message="Gagal memuat" onRetry={sync} />;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
        <Receipt
          className="mx-auto h-10 w-10 text-stone-300"
          aria-hidden="true"
        />
        <p className="mt-3 text-base font-semibold text-stone-700">
          Belum ada pembayaran yang perlu dicek
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Bukti bayar QRIS yang dikirim pelanggan akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Cocokkan nominal di bukti bayar dengan total pesanan sebelum menekan{' '}
        <strong>Pembayaran Sesuai</strong>.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {orders.map((order) => {
          const isRejecting = rejectingId === order.id;
          const errorText = actionErrors[order.id];

          return (
            <div
              key={order.id}
              className="flex flex-col justify-between rounded-3xl border border-orange-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-2xl font-bold text-red-600 tabular-nums">
                      {order.nomorPesanan}
                    </span>
                    <h2 className="mt-0.5 text-lg font-bold text-stone-900">
                      {order.nama}
                    </h2>
                    <p className="text-xs text-stone-500">
                      Ambil {order.waktuAmbil} WIB ·{' '}
                      {order.waktuUnggahBukti
                        ? `Dikirim ${formatTanggalJamWib(order.waktuUnggahBukti)}`
                        : formatTanggalJamWib(order.waktuDibuat)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-stone-500">Total Bayar</p>
                    <p className="font-mono text-xl font-bold text-stone-900 tabular-nums">
                      {formatRupiah(order.totalHarga)}
                    </p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-700">
                  {order.daftarTopping.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <ToppingImage
                          src={item.imageUrl}
                          alt={item.nama}
                          sizes="32px"
                          className="h-8 w-8 shrink-0"
                          roundedClassName="rounded-md"
                        />
                        <span className="truncate">{item.nama} x{item.quantity ?? 1}</span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatRupiah(item.harga * (item.quantity ?? 1))}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Foto Bukti Bayar */}
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-stone-600">
                    Foto Bukti Bayar
                  </p>
                  {order.buktiBayar ? (
                    <button
                      type="button"
                      onClick={() => setZoomProofUrl(order.buktiBayar!)}
                      className="group relative block w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-2 text-center hover:border-orange-300"
                    >
                      <Image
                        src={order.buktiBayar}
                        alt={`Bukti bayar ${order.nomorPesanan}`}
                        width={1000}
                        height={800}
                        sizes="(max-width: 768px) 90vw, 600px"
                        unoptimized
                        className="mx-auto max-h-56 w-auto rounded-xl object-contain"
                      />
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-600 group-hover:text-red-600">
                        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ketuk untuk perbesar</span>
                      </span>
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-stone-100 p-4 text-center text-xs text-stone-500">
                      Tidak ada foto bukti bayar.
                    </div>
                  )}
                </div>

                {errorText && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errorText}</span>
                  </div>
                )}
              </div>

              {/* Aksi Konfirmasi / Tolak */}
              <div className="mt-5 border-t border-stone-100 pt-4">
                {isRejecting ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-stone-800">
                      Alasan Penolakan <span className="text-red-600">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALASAN_CEPAT.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectReason(preset)}
                          className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-orange-50"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Tulis alasan singkat..."
                      className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm text-stone-900 focus:border-red-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="flex h-11 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSubmit(order.id)}
                        className="flex h-11 flex-1 items-center justify-center rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Kirim Penolakan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(order.id);
                        setRejectReason('');
                      }}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConfirm(order)}
                      className="inline-flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>Pembayaran Sesuai</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Perbesar Bukti Bayar */}
      {zoomProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomProofUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-lg rounded-3xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomProofUrl(null)}
              aria-label="Tutup perbesaran bukti bayar"
              className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <Image
              src={zoomProofUrl}
              alt="Bukti bayar diperbesar"
              width={1200}
              height={1000}
              sizes="(max-width: 768px) 90vw, 600px"
              unoptimized
              className="max-h-[78vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
