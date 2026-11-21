'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, ReceiptText } from 'lucide-react';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { hitungStatistikLaporan, unduhLaporanPdf } from '@/lib/pdfReport';
import { getStaffOrders, subscribeDataChanges } from '@/lib/storage';
import {
  formatRupiah,
  formatTanggalJamWib,
  getPeriodInfoWib,
  isOrderInPeriodWib,
} from '@/lib/time';
import type { Order, PeriodeLaporan } from '@/lib/types';

const PERIODE_TABS: Array<{ id: PeriodeLaporan; label: string }> = [
  { id: 'hari', label: 'Hari Ini' },
  { id: 'minggu', label: 'Minggu Ini' },
  { id: 'bulan', label: 'Bulan Ini' },
];

export function LaporanView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [periode, setPeriode] = useState<PeriodeLaporan>('hari');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const sync = () => setOrders(getStaffOrders());
    sync();
    return subscribeDataChanges(sync);
  }, []);

  const periodInfo = useMemo(() => getPeriodInfoWib(periode), [periode]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => isOrderInPeriodWib(order, periode))
      .sort((a, b) => Date.parse(b.waktuDibuat) - Date.parse(a.waktuDibuat));
  }, [orders, periode]);

  const stats = useMemo(
    () => hitungStatistikLaporan(filteredOrders),
    [filteredOrders]
  );

  const top3Toppings = stats.toppingTerlaris.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Tab Periode & Tombol Unduh PDF */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-stone-200/70 p-1.5 sm:w-auto">
          {PERIODE_TABS.map((tab) => {
            const isActive = periode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriode(tab.id)}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={filteredOrders.length === 0}
          onClick={() => unduhLaporanPdf(filteredOrders, periode)}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 active:scale-[0.98] whitespace-nowrap"
        >
          <FileDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Unduh Laporan PDF</span>
        </button>
      </div>

      <p className="text-sm font-medium text-stone-600">{periodInfo.label}</p>

      {/* Kartu Ringkasan */}
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
          <p className="text-xs font-medium text-stone-500">
            Online · Prasmanan
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-stone-900 tabular-nums">
            {stats.jumlahOnline} · {stats.jumlahPrasmanan}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">
            3 Topping Terlaris
          </p>
          {top3Toppings.length === 0 ? (
            <p className="mt-1.5 text-sm text-stone-400">Belum ada data</p>
          ) : (
            <ul className="mt-1.5 space-y-0.5 text-xs text-stone-800">
              {top3Toppings.map((t, idx) => (
                <li
                  key={t.nama}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate font-medium">
                    {idx + 1}. {t.nama}
                  </span>
                  <span className="font-mono font-semibold text-orange-700 tabular-nums">
                    {t.jumlah}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Daftar Riwayat Pesanan */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
          <ReceiptText
            className="mx-auto h-10 w-10 text-stone-300"
            aria-hidden="true"
          />
          <p className="mt-3 text-base font-semibold text-stone-700">
            Belum ada pesanan pada periode ini
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
            {filteredOrders.map((order) => (
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
                    <span className="font-semibold text-stone-900">
                      {order.nama}
                    </span>
                    <span className="text-xs text-stone-500">
                      {order.sumber} · {order.statusPesanan}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {formatTanggalJamWib(order.waktuDibuat)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-stone-900 tabular-nums">
                    {formatRupiah(order.totalHarga)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {order.daftarTopping.length} topping
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
