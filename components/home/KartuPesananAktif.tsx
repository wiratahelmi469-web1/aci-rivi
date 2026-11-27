import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { formatRupiah } from '@/lib/time';
import type { Order } from '@/lib/types';

function statusLabel(order: Order) {
  if (order.statusBayar === 'Menunggu Pembayaran') return 'Menunggu pembayaran';
  if (order.statusBayar === 'Menunggu Konfirmasi') return 'Pembayaran dicek';
  if (order.statusBayar === 'Ditolak') return 'Bukti pembayaran ditolak';
  if (order.statusPesanan === 'Siap Diambil') return 'Siap diambil';
  if (order.statusPesanan === 'Sedang Dibuat') return 'Sedang dibuat';
  return 'Pesanan diterima';
}

export function KartuPesananAktif({ order }: { order: Order }) {
  return (
    <section aria-labelledby="pesanan-aktif" className="rounded-3xl border border-orange-200 bg-white p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pesanan Aktif</p>
          <h2 id="pesanan-aktif" className="mt-1 font-mono text-2xl font-extrabold text-red-600 tabular-nums sm:text-3xl">
            {order.nomorPesanan}
          </h2>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800">
          {statusLabel(order)}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-stone-700">
        <Clock3 className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
        {order.waktuAmbil === 'Langsung' ? 'Ambil langsung' : `Ambil pukul ${order.waktuAmbil} WIB`}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {order.daftarTopping.map((item) => (
          <li key={item.id} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
            {item.nama} x{item.quantity ?? 1}
          </li>
        ))}
      </ul>
      <Link
        href={`/pesanan/${encodeURIComponent(order.id)}`}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 sm:w-auto"
      >
        Lihat Detail
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function PesananAktifKosong({ storeOpen }: { storeOpen: boolean }) {
  return (
    <section className="rounded-3xl border border-dashed border-stone-300 bg-white p-5 sm:p-7">
      <p className="text-lg font-bold text-stone-900">Belum ada pesanan aktif</p>
      <p className="mt-1 text-sm text-stone-600">
        {storeOpen
          ? 'Yuk, racik seblak favoritmu dan tentukan jam pengambilannya.'
          : 'Toko sedang tutup. Pesanan baru bisa dibuat saat toko buka.'}
      </p>
    </section>
  );
}

export function PesananAktifSkeleton() {
  return (
    <div aria-label="Memuat pesanan aktif" className="animate-pulse rounded-3xl border border-stone-200 bg-white p-5">
      <div className="h-3 w-28 rounded bg-stone-200" />
      <div className="mt-3 h-8 w-36 rounded bg-stone-200" />
      <div className="mt-5 h-4 w-48 rounded bg-stone-100" />
      <div className="mt-4 h-10 w-full rounded-xl bg-stone-100" />
    </div>
  );
}
