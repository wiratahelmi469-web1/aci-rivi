'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock3, RotateCcw } from 'lucide-react';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order } from '@/lib/types';

interface PesananTerakhirProps {
  orders: Order[];
  isLoading: boolean;
}

function statusLabel(order: Order) {
  if (order.statusBayar === 'Menunggu Pembayaran') return 'Menunggu pembayaran';
  if (order.statusBayar === 'Menunggu Konfirmasi') return 'Pembayaran dicek';
  if (order.statusBayar === 'Ditolak') return 'Bukti ditolak';
  if (order.statusBayar === 'Kedaluwarsa') return 'Kedaluwarsa';
  return order.statusPesanan;
}

export function PesananTerakhir({ orders, isLoading }: PesananTerakhirProps) {
  const router = useRouter();

  const pesanLagi = (order: Order) => {
    sessionStorage.setItem(
      'aci-rivi-repeat-order',
      JSON.stringify(
        order.daftarTopping.map((item) => ({
          id: item.id,
          quantity: item.quantity ?? 1,
        }))
      )
    );
    router.push('/pesan?ulang=1');
  };

  return (
    <section aria-labelledby="pesanan-terakhir">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Riwayat singkat</p>
          <h2 id="pesanan-terakhir" className="mt-1 text-xl font-extrabold text-stone-900 sm:text-2xl">
            Pesanan Terakhir
          </h2>
        </div>
        <Link href="/pesanan" className="text-sm font-bold text-red-700 hover:underline">
          Semua pesanan
        </Link>
      </div>
      {isLoading ? (
        <ul aria-label="Memuat pesanan terakhir" className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <li key={item} className="h-40 animate-pulse rounded-2xl border border-stone-200 bg-white p-4">
              <div className="h-4 w-28 rounded bg-stone-200" />
              <div className="mt-4 h-3 w-36 rounded bg-stone-100" />
              <div className="mt-4 h-8 rounded bg-stone-100" />
            </li>
          ))}
        </ul>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
          Pesanan sebelumnya akan muncul di sini.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {orders.map((order) => (
            <li key={order.id} className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-base font-extrabold text-red-600 tabular-nums">
                  {order.nomorPesanan}
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-700">
                  {statusLabel(order)}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {formatTanggalJamWib(order.waktuDibuat)}
              </p>
              <p className="mt-2 font-mono text-sm font-bold text-stone-900 tabular-nums">
                {formatRupiah(order.totalHarga)}
              </p>
              <button
                type="button"
                onClick={() => pesanLagi(order)}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 text-sm font-bold text-red-700 transition hover:bg-orange-100"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Pesan Lagi
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
