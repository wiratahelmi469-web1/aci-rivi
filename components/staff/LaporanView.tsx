'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, ReceiptText } from 'lucide-react';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { ErrorRetryCard, OrderListSkeleton } from '@/components/Skeletons';
import { hitungStatistikLaporan, unduhLaporanPdf } from '@/lib/pdfReport';
import {
  formatDateTimeLocalWib,
  formatRupiah,
  formatTanggalJamWib,
  parseDateTimeLocalWib,
} from '@/lib/time';
import type { Order } from '@/lib/types';

function getDefaultRange() {
  const now = new Date();
  return {
    start: `${formatDateTimeLocalWib(now).slice(0, 10)}T00:00`,
    end: formatDateTimeLocalWib(now),
  };
}

export function LaporanView() {
  const [initialRange] = useState(getDefaultRange);
  const [startValue, setStartValue] = useState(initialRange.start);
  const [endValue, setEndValue] = useState(initialRange.end);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const range = useMemo(() => {
    const start = parseDateTimeLocalWib(startValue);
    const end = parseDateTimeLocalWib(endValue);
    return { start, end, valid: Boolean(start && end && end >= start) };
  }, [startValue, endValue]);

  useEffect(() => {
    if (!range.valid || !range.start || !range.end) return;

    const controller = new AbortController();
    const query = new URLSearchParams({
      from: range.start.toISOString(),
      to: new Date(range.end.getTime() + 59_999).toISOString(),
    });
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError(false);
      setOrders([]);
      void fetch(`/api/orders?${query}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Gagal memuat laporan.');
          return (await response.json()) as Order[];
        })
        .then((data) => {
          setOrders(data);
          setLoadError(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setLoadError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [range, retry]);

  const visibleOrders = useMemo(
    () => (range.valid ? orders : []),
    [range.valid, orders]
  );
  const stats = useMemo(() => hitungStatistikLaporan(visibleOrders), [visibleOrders]);
  const top3Toppings = stats.toppingTerlaris.slice(0, 3);
  const rangeError = !range.valid
    ? !range.start || !range.end
      ? 'Tanggal dan waktu mulai serta akhir harus diisi.'
      : 'Waktu akhir tidak boleh lebih awal dari waktu mulai.'
    : '';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-800">
            Mulai (WIB)
            <input
              type="datetime-local"
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-red-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Akhir (WIB)
            <input
              type="datetime-local"
              value={endValue}
              onChange={(event) => setEndValue(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-red-500 focus:outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={isLoading || Boolean(rangeError) || visibleOrders.length === 0}
          onClick={() => {
            if (range.start && range.end) {
              unduhLaporanPdf(orders, range.start, range.end);
            }
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
        >
          <FileDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Unduh Laporan PDF</span>
        </button>
      </div>

      {rangeError && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {rangeError}
        </p>
      )}
      {range.valid && range.start && range.end && (
        <p className="text-sm font-medium text-stone-600">
          Rentang: {formatTanggalJamWib(range.start)} – {formatTanggalJamWib(range.end)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Jumlah Pesanan</p>
          <p className="mt-1 font-mono text-2xl font-bold text-stone-900 tabular-nums">
            {stats.totalPesanan}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Total Pendapatan</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {formatRupiah(stats.totalPendapatan)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Online · Prasmanan</p>
          <p className="mt-1 font-mono text-xl font-bold text-stone-900 tabular-nums">
            {stats.jumlahOnline} · {stats.jumlahPrasmanan}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">3 Topping Terlaris</p>
          {top3Toppings.length === 0 ? (
            <p className="mt-1.5 text-sm text-stone-400">Belum ada data</p>
          ) : (
            <ul className="mt-1.5 space-y-0.5 text-xs text-stone-800">
              {top3Toppings.map((topping, index) => (
                <li
                  key={topping.nama}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate font-medium">
                    {index + 1}. {topping.nama}
                  </span>
                  <span className="font-mono font-semibold text-orange-700 tabular-nums">
                    {topping.jumlah}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {rangeError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Perbaiki rentang waktu untuk memuat riwayat.
        </div>
      ) : isLoading ? (
        <OrderListSkeleton count={4} />
      ) : loadError ? (
        <ErrorRetryCard message="Gagal memuat" onRetry={() => setRetry((value) => value + 1)} />
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-stone-300" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-stone-700">
            Belum ada pesanan pada rentang ini
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-stone-900">
              Riwayat Pesanan (Terbaru di Atas)
            </h2>
          </div>
          <div className="divide-y divide-stone-100">
            {visibleOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-orange-50/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-sm font-bold text-red-600 tabular-nums">
                      {order.nomorPesanan}
                    </span>
                    <span className="font-semibold text-stone-900">{order.nama}</span>
                    <span className="text-xs text-stone-500">
                      {order.sumber} · {order.statusPesanan}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {formatTanggalJamWib(order.waktuDibuat)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold text-stone-900 tabular-nums">
                    {formatRupiah(order.totalHarga)}
                  </p>
                  <p className="max-w-56 truncate text-xs text-stone-500">
                    {order.daftarTopping.map((item) => `${item.nama} x${item.quantity ?? 1}`).join(' · ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
