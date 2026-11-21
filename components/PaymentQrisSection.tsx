'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Clock,
  Download,
  ImagePlus,
  Maximize2,
  QrCode,
  X,
} from 'lucide-react';
import { compressPaymentProof } from '@/lib/imageCompress';
import {
  ajukanBuktiPembayaran,
  batalkanPesananPelanggan,
} from '@/lib/payment';
import {
  getStoreSettings,
  markOrderExpired,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Order } from '@/lib/types';

interface PaymentQrisSectionProps {
  order: Order;
}

export function PaymentQrisSection({ order }: PaymentQrisSectionProps) {
  const router = useRouter();
  const [qrisImage, setQrisImage] = useState<string | undefined>(undefined);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomQris, setZoomQris] = useState(false);

  useEffect(() => {
    const syncSettings = () => {
      setQrisImage(getStoreSettings().qrisImage);
    };
    syncSettings();
    return subscribeDataChanges(syncSettings);
  }, []);

  useEffect(() => {
    if (order.statusBayar !== 'Menunggu Pembayaran' || !order.batasBayar) {
      return;
    }

    const tick = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.parse(order.batasBayar!) - Date.now()) / 1000)
      );
      setRemainingSeconds(diff);
      if (diff === 0) {
        markOrderExpired(order.id);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [order.id, order.statusBayar, order.batasBayar]);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError('');
    setIsCompressing(true);
    try {
      const compressed = await compressPaymentProof(file);
      setProofPreview(compressed);
    } catch (err) {
      setProofPreview('');
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses foto bukti bayar.'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofPreview || isSubmitting) return;
    setIsSubmitting(true);
    setUploadError('');

    try {
      const res = await ajukanBuktiPembayaran(order.id, proofPreview);
      if (!res.sukses) {
        setUploadError(res.pesan);
      } else {
        setProofPreview('');
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim bukti pembayaran.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    batalkanPesananPelanggan(order.id);
    router.push('/');
  };

  const isRejected = order.statusBayar === 'Ditolak';

  return (
    <div className="space-y-5">
      {/* Banner Penolakan jika pegawai menolak bukti sebelumnya */}
      {isRejected && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-bold">Bukti Pembayaran Ditolak</p>
              <p className="mt-0.5 text-sm text-red-800">
                Alasan: <strong>{order.alasanPenolakan || 'Perlu dicek ulang'}</strong>
              </p>
              <p className="mt-1 text-xs text-red-700">
                Silakan unggah ulang foto bukti bayar yang benar di bawah ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan Nomor Pesanan, Total, & Countdown 15 Menit */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <p className="text-xs text-stone-500">Nomor Pesanan</p>
            <p className="font-mono text-2xl font-bold text-red-600 tabular-nums">
              {order.nomorPesanan}
            </p>
          </div>

          {order.statusBayar === 'Menunggu Pembayaran' && (
            <div className="text-right">
              <p className="text-xs text-stone-500">Batas Waktu</p>
              <p
                className={`inline-flex items-center gap-1 font-mono text-lg font-bold tabular-nums ${
                  remainingSeconds <= 120 ? 'text-red-600' : 'text-stone-900'
                }`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{formatCountdown(remainingSeconds)}</span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs font-medium text-stone-500">Total yang Harus Dibayar</p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-stone-900 tabular-nums">
            {formatRupiah(order.totalHarga)}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {order.nama} · Ambil pukul {order.waktuAmbil} WIB
          </p>
        </div>

        {/* Gambar QRIS Toko */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
          {qrisImage ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setZoomQris(true)}
                className="group relative mx-auto block overflow-hidden rounded-xl border border-stone-200 bg-white p-2 focus-visible:outline-2 focus-visible:outline-red-600"
                aria-label="Perbesar gambar QRIS"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisImage}
                  alt="Kode QRIS Toko Aci Rivi"
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-72 w-auto rounded-lg object-contain"
                />
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-600 group-hover:text-red-600">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ketuk untuk perbesar</span>
                </span>
              </button>

              <a
                href={qrisImage}
                download={`QRIS-Aci-Rivi-${order.nomorPesanan.replace('#', '')}.jpg`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Simpan Gambar QRIS</span>
              </a>
            </div>
          ) : (
            <div className="py-8">
              <QrCode
                className="mx-auto h-10 w-10 text-stone-400"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-semibold text-stone-700">
                Gambar QRIS toko belum diunggah pegawai.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Silakan hubungi kasir atau coba muat ulang beberapa saat lagi.
              </p>
            </div>
          )}
        </div>

        {/* Petunjuk Singkat */}
        <ol className="mt-5 space-y-1.5 rounded-2xl bg-orange-50/70 p-4 text-sm text-stone-800">
          <li>1. Scan QRIS dengan aplikasi bank atau e-wallet.</li>
          <li>2. Bayar sesuai total.</li>
          <li>3. Unggah tangkapan layar bukti bayar.</li>
          <li>4. Tekan &lsquo;Saya Sudah Bayar&rsquo;.</li>
        </ol>

        {/* Unggah Foto Bukti Bayar */}
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-bold text-stone-900">
            Foto Bukti Bayar <span className="text-red-600">*</span>
          </label>

          <label className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-red-400 hover:bg-orange-50/50">
            <ImagePlus className="h-5 w-5 text-red-600" aria-hidden="true" />
            <span>
              {isCompressing
                ? 'Memproses foto...'
                : proofPreview
                  ? 'Ganti Foto Bukti Bayar'
                  : 'Unggah Bukti Bayar'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isCompressing || isSubmitting}
              className="sr-only"
            />
          </label>

          {proofPreview && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreview}
                alt="Pratinjau bukti pembayaran"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-56 rounded-xl object-contain"
              />
            </div>
          )}

          {uploadError && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {uploadError}
            </p>
          )}
        </div>

        {/* Tombol Saya Sudah Bayar & Batalkan */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={!proofPreview || isCompressing || isSubmitting}
            onClick={handleSubmitProof}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-red-600 px-6 text-base font-bold text-white shadow-xs transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 active:scale-[0.99]"
          >
            {isSubmitting ? 'Mengirim Bukti...' : 'Saya Sudah Bayar'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 text-sm font-bold text-stone-700 hover:bg-stone-50"
          >
            Batalkan Pesanan
          </button>
        </div>
      </div>

      {/* Modal Perbesar Gambar QRIS */}
      {zoomQris && qrisImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomQris(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-lg rounded-3xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomQris(false)}
              aria-label="Tutup perbesaran QRIS"
              className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrisImage}
              alt="Kode QRIS Toko Aci Rivi diperbesar"
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
