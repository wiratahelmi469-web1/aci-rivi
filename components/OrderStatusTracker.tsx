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
    label: 'Pesanan diterima',
    deskripsi: 'Pesanan sudah masuk ke dapur Aci Rivi.',
    Icon: Clock,
  },
  {
    status: 'Sedang Dibuat',
    label: 'Sedang dibuat',
    deskripsi: 'Seblak pesananmu sedang dimasak.',
    Icon: ChefHat,
  },
  {
    status: 'Siap Diambil',
    label: 'Siap diambil',
    deskripsi: 'Ambil pesananmu di kasir Aci Rivi.',
    Icon: PackageCheck,
  },
  {
    status: 'Selesai',
    label: 'Selesai',
    deskripsi: 'Pesanan sudah diambil. Terima kasih!',
    Icon: CheckCircle2,
  },
];

export function OrderStatusTracker({
  order,
  justPaid = false,
}: OrderStatusTrackerProps) {
  const found = TAHAP_LIST.findIndex((t) => t.status === order.statusPesanan);
  const activeIndex = found === -1 ? 0 : found;
  const isReady = order.statusPesanan === 'Siap Diambil';
  const isDone = order.statusPesanan === 'Selesai';
  const current = TAHAP_LIST[activeIndex];

  const heroClass = isReady
    ? 'bg-red-600 text-white'
    : isDone
      ? 'border border-stone-200 bg-white text-stone-900'
      : 'border border-stone-200 bg-white text-stone-900';

  return (
    <div className="space-y-4">
      {justPaid && !isReady && !isDone && (
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

      {/* Kartu utama: status + nomor pesanan */}
      <section
        aria-live="polite"
        className={`rounded-3xl p-6 text-center ${heroClass}`}
      >
        <p
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${
            isReady
              ? 'bg-white/20 text-white'
              : isDone
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-orange-100 text-orange-800'
          }`}
        >
          {!isDone && (
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${
                  isReady ? 'bg-white' : 'bg-orange-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isReady ? 'bg-white' : 'bg-orange-500'
                }`}
              />
            </span>
          )}
          {current.label}
        </p>

        <p
          className={`mt-4 font-mono text-6xl font-bold tracking-tight tabular-nums ${
            isReady ? 'text-white' : isDone ? 'text-stone-400' : 'text-red-600'
          }`}
        >
          {order.nomorPesanan}
        </p>

        <p
          className={`mx-auto mt-3 max-w-xs text-sm leading-relaxed ${
            isReady ? 'text-red-50' : 'text-stone-600'
          }`}
        >
          {isReady
            ? 'Tunjukkan nomor ini ke kasir untuk mengambil pesananmu.'
            : isDone
              ? current.deskripsi
              : `${current.deskripsi} Halaman ini diperbarui otomatis.`}
        </p>

        <dl
          className={`mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-left text-sm ${
            isReady ? 'border-white/20' : 'border-stone-100'
          }`}
        >
          <div>
            <dt className={isReady ? 'text-red-100' : 'text-stone-500'}>Atas nama</dt>
            <dd className="mt-0.5 truncate font-semibold">{order.nama}</dd>
          </div>
          <div>
            <dt className={isReady ? 'text-red-100' : 'text-stone-500'}>Waktu ambil</dt>
            <dd className="mt-0.5 font-semibold">
              {order.waktuAmbil === 'Langsung'
                ? 'Langsung di tempat'
                : `${order.waktuAmbil} WIB`}
            </dd>
          </div>
        </dl>
      </section>

      {/* Tahapan pesanan */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-bold text-stone-900">Perjalanan pesanan</h2>

        <ol className="mt-4">
          {TAHAP_LIST.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isCurrent = index === activeIndex;
            const isUpcoming = index > activeIndex;
            const StepIcon = step.Icon;

            return (
              <li
                key={step.status}
                aria-current={isCurrent ? 'step' : undefined}
                className="relative flex gap-3.5 pb-6 last:pb-0"
              >
                {index < TAHAP_LIST.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-10 left-5 -ml-px h-[calc(100%-2.5rem)] w-0.5 ${
                      isCompleted ? 'bg-red-600' : 'bg-stone-200'
                    }`}
                  />
                )}

                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-red-600 text-white'
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
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                        Sekarang
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
      </section>

      {/* Ringkasan pesanan */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-2 border-b border-stone-100 pb-3">
          <h2 className="text-base font-bold text-stone-900">Ringkasan pesanan</h2>
          <span className="text-xs text-stone-500">
            {formatTanggalJamWib(order.waktuDibuat)}
          </span>
        </div>

        <ul className="divide-y divide-stone-100">
          {order.daftarTopping.map((item, idx) => (
            <li
              key={`${item.id}-${idx}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
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
          <span className="text-base font-bold text-stone-900">Total</span>
          <span className="font-mono text-lg font-bold text-red-600 tabular-nums">
            {formatRupiah(order.totalHarga)}
          </span>
        </div>
      </section>
    </div>
  );
}