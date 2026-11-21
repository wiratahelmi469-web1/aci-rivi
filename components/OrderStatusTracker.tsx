'use client';

import { CheckCircle2, ChefHat, Clock, PackageCheck } from 'lucide-react';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order, StatusPesanan } from '@/lib/types';

interface OrderStatusTrackerProps {
  order: Order;
  justPaid?: boolean;
}

const TAHAP_LIST: Array<{
  status: StatusPesanan;
  label: string;
  deskripsi: string;
  Icon: typeof CheckCircle2;
}> = [
  {
    status: 'Baru',
    label: 'Pesanan Diterima',
    deskripsi: 'Pesanan sudah masuk ke dapur Aci Rivi.',
    Icon: Clock,
  },
  {
    status: 'Sedang Dibuat',
    label: 'Sedang Dibuat',
    deskripsi: 'Seblak pesananmu sedang dimasak.',
    Icon: ChefHat,
  },
  {
    status: 'Siap Diambil',
    label: 'Siap Diambil',
    deskripsi: 'Silakan ambil pesananmu di kasir Aci Rivi.',
    Icon: PackageCheck,
  },
  {
    status: 'Selesai',
    label: 'Selesai',
    deskripsi: 'Pesanan telah diambil. Terima kasih!',
    Icon: CheckCircle2,
  },
];

export function OrderStatusTracker({
  order,
  justPaid = false,
}: OrderStatusTrackerProps) {
  const activeIndex = TAHAP_LIST.findIndex(
    (t) => t.status === order.statusPesanan
  );

  return (
    <div className="space-y-5">
      {justPaid && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2
            className="h-6 w-6 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div>
            <p className="text-base font-bold">Pembayaran berhasil</p>
            <p className="text-sm text-emerald-800">
              Pesananmu sudah diteruskan ke pegawai dapur.
            </p>
          </div>
        </div>
      )}

      {/* Kartu Nomor Pesanan & Waktu Ambil */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-xs">
        <p className="text-sm font-medium text-stone-500">Nomor Pesanan</p>
        <p className="mt-1 font-mono text-5xl font-bold tracking-tight text-red-600 tabular-nums">
          {order.nomorPesanan}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-stone-600">
          <span className="font-semibold text-stone-900">{order.nama}</span>
          <span aria-hidden="true">·</span>
          <span>
            Ambil:{' '}
            <strong className="text-stone-900">
              {order.waktuAmbil === 'Langsung'
                ? 'Langsung di tempat'
                : `${order.waktuAmbil} WIB`}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>{order.sumber}</span>
        </div>
      </div>

      {/* Pelacakan 4 Tahap Real-Time */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-stone-900">Status Pesanan</h2>
          <span className="text-xs font-medium text-stone-500">
            Pembaruan otomatis
          </span>
        </div>

        <ol className="space-y-4">
          {TAHAP_LIST.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const isUpcoming = index > activeIndex;
            const StepIcon = step.Icon;

            return (
              <li key={step.status} className="flex items-start gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-red-600 text-white shadow-xs'
                      : isCompleted
                        ? 'bg-orange-100 text-red-700'
                        : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  <StepIcon className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-base font-semibold ${
                        isUpcoming ? 'text-stone-400' : 'text-stone-900'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="text-xs font-bold text-red-600">
                        Saat ini
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-xs font-medium text-stone-500">
                        Selesai
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 text-sm ${
                      isUpcoming ? 'text-stone-400' : 'text-stone-600'
                    }`}
                  >
                    {step.deskripsi}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Ringkasan Topping */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <h2 className="text-base font-bold text-stone-900">
            Ringkasan Pesanan
          </h2>
          <span className="text-xs text-stone-500">
            {formatTanggalJamWib(order.waktuDibuat)}
          </span>
        </div>

        <ul className="divide-y divide-stone-100">
          {order.daftarTopping.map((item, idx) => (
            <li
              key={`${item.id}-${idx}`}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="font-medium text-stone-800">
                {item.emoji ? `${item.emoji} ` : ''}
                {item.nama}
              </span>
              <span className="font-mono font-medium text-stone-700 tabular-nums">
                {formatRupiah(item.harga)}
              </span>
            </li>
          ))}
        </ul>

        {order.catatan && (
          <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
            <span className="font-semibold text-stone-900">Catatan: </span>
            {order.catatan}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="text-base font-bold text-stone-900">Total Bayar</span>
          <span className="font-mono text-lg font-bold text-red-600 tabular-nums">
            {formatRupiah(order.totalHarga)}
          </span>
        </div>
      </div>
    </div>
  );
}
