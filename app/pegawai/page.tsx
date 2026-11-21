'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  CreditCard,
  FileBarChart2,
  PackageCheck,
  PlusCircle,
  QrCode,
} from 'lucide-react';
import {
  getPendingPaymentOrders,
  getStaffOrders,
  subscribeDataChanges,
} from '@/lib/storage';

export default function PegawaiHomePage() {
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);

  useEffect(() => {
    const syncCounts = () => {
      const orders = getStaffOrders();
      setActiveOrderCount(
        orders.filter((o) => o.statusPesanan !== 'Selesai').length
      );
      setPendingPaymentCount(getPendingPaymentOrders().length);
    };
    syncCounts();
    const unsub = subscribeDataChanges(syncCounts);
    const interval = window.setInterval(syncCounts, 2500);
    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">
          Beranda Pegawai Aci Rivi
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Pilih menu pekerjaan di bawah ini.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Pesanan Masuk */}
        <Link
          href="/pegawai/pesanan"
          className="flex min-h-[148px] flex-col justify-between rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 p-6 text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <ClipboardList className="h-6 w-6" aria-hidden="true" />
            </div>
            <span className="font-mono text-sm font-bold text-orange-50 tabular-nums">
              {activeOrderCount} aktif
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">Pesanan Masuk</h3>
            <p className="mt-1 text-sm text-orange-50">
              Proses pesanan lunas &amp; prasmanan serta ubah status masak.
            </p>
          </div>
        </Link>

        {/* 2. Cek Pembayaran */}
        <Link
          href="/pegawai/pembayaran"
          className={`flex min-h-[148px] flex-col justify-between rounded-3xl border p-6 text-stone-900 transition-colors active:scale-[0.99] ${
            pendingPaymentCount > 0
              ? 'border-orange-300 bg-orange-50/70 hover:border-red-400'
              : 'border-stone-200 bg-white hover:border-orange-300'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-red-600">
              <CreditCard className="h-6 w-6" aria-hidden="true" />
            </div>
            {pendingPaymentCount > 0 ? (
              <span className="rounded-lg bg-red-600 px-2.5 py-1 font-mono text-xs font-bold text-white tabular-nums">
                {pendingPaymentCount} menunggu
              </span>
            ) : (
              <span className="font-mono text-xs font-semibold text-stone-500 tabular-nums">
                0 menunggu
              </span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">Cek Pembayaran</h3>
            <p className="mt-1 text-sm text-stone-600">
              Periksa bukti transfer QRIS pelanggan sebelum masuk dapur.
            </p>
          </div>
        </Link>

        {/* 3. Catat Pesanan Langsung */}
        <Link
          href="/pegawai/kasir"
          className="flex min-h-[148px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
            <PlusCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">Catat Pesanan Langsung</h3>
            <p className="mt-1 text-sm text-stone-600">
              Input pesanan pelanggan prasmanan yang bayar di kasir.
            </p>
          </div>
        </Link>

        {/* 4. Kelola Stok dan Harga */}
        <Link
          href="/pegawai/stok"
          className="flex min-h-[148px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
            <PackageCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">Kelola Stok dan Harga</h3>
            <p className="mt-1 text-sm text-stone-600">
              Unggah foto topping, atur stok porsi, dan perbarui harga.
            </p>
          </div>
        </Link>

        {/* 5. Riwayat dan Laporan */}
        <Link
          href="/pegawai/laporan"
          className="flex min-h-[148px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
            <FileBarChart2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">Riwayat dan Laporan</h3>
            <p className="mt-1 text-sm text-stone-600">
              Ringkasan harian, mingguan, bulanan, dan unduh PDF.
            </p>
          </div>
        </Link>

        {/* 6. Pengaturan QRIS */}
        <Link
          href="/pegawai/pengaturan"
          className="flex min-h-[148px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
            <QrCode className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold">Pengaturan QRIS</h3>
            <p className="mt-1 text-sm text-stone-600">
              Unggah atau ganti gambar kode QRIS resmi toko Aci Rivi.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
