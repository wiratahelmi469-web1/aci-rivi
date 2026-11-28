'use client';

import { MessageCircle, X } from 'lucide-react';
import { ToppingImage } from '@/components/ToppingImage';
import { formatRupiah, formatTanggalJamWib } from '@/lib/time';
import type { Order } from '@/lib/types';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
}

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  const waHref = order.nomorWhatsApp
    ? `https://wa.me/${order.nomorWhatsApp.replace(/^0/, '62').replace(/\D/g, '')}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-pesanan-judul"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <p className="text-xs font-medium text-stone-500">
              {order.sumber} · {order.statusPesanan}
            </p>
            <h2
              id="detail-pesanan-judul"
              className="mt-0.5 font-mono text-2xl font-bold text-red-600 tabular-nums"
            >
              Pesanan {order.nomorPesanan}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900"
            aria-label="Tutup detail pesanan"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4 text-sm">
            <div>
              <p className="text-xs text-stone-500">Nama Pelanggan</p>
              <p className="mt-0.5 font-semibold text-stone-900">{order.nama}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Waktu Ambil</p>
              <p className="mt-0.5 font-semibold text-stone-900">
                {order.waktuAmbil === 'Langsung'
                  ? 'Langsung'
                  : `${order.waktuAmbil} WIB`}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Nomor WhatsApp</p>
              {order.nomorWhatsApp ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{order.nomorWhatsApp}</span>
                </a>
              ) : (
                <p className="mt-0.5 font-medium text-stone-500">-</p>
              )}
            </div>
            <div>
              <p className="text-xs text-stone-500">Waktu Masuk</p>
              <p className="mt-0.5 font-medium text-stone-800">
                {formatTanggalJamWib(order.waktuDibuat)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Daftar Topping ({order.daftarTopping.reduce((sum, item) => sum + (item.quantity ?? 1), 0)})
            </h3>
            <ul className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-200 px-4">
              {order.daftarTopping.map((item, idx) => (
                <li
                  key={`${item.id}-${idx}`}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 font-medium text-stone-800">
                    <ToppingImage
                      src={item.imageUrl}
                      alt={item.nama}
                      sizes="40px"
                      className="h-10 w-10 shrink-0"
                      roundedClassName="rounded-lg"
                    />
                    <span className="truncate">{item.nama} x{item.quantity ?? 1}</span>
                  </span>
                  <span className="font-mono text-stone-700 tabular-nums">
                    {formatRupiah(item.harga * (item.quantity ?? 1))}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {order.catatan && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3.5 text-sm text-stone-800">
              <p className="text-xs font-semibold text-orange-800">Catatan</p>
              <p className="mt-0.5">{order.catatan}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-200 pt-4">
            <span className="text-base font-bold text-stone-900">Total</span>
            <span className="font-mono text-xl font-bold text-red-600 tabular-nums">
              {formatRupiah(order.totalHarga)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
