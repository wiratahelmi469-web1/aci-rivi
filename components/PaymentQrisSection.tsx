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
import { BATAS_BAYAR_MENIT } from '@/lib/constants';
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

const TOTAL_DETIK = BATAS_BAYAR_MENIT * 60;

export function PaymentQrisSection({ order }: PaymentQrisSectionProps) {
  const router = useRouter();
  const [qrisImage, setQrisImage] = useState<string | undefined>(undefined);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_DETIK);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomQris, setZoomQris] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

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

  useEffect(() => {
    if (!zoomQris) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomQris(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomQris]);

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
  const isCounting = order.statusBayar === 'Menunggu Pembayaran';
  const lowTime = remainingSeconds <= 120;
  const progress = Math.max(0, Math.min(100, (remainingSeconds / TOTAL_DETIK) * 100));

  return (
    <div className="grid grid-cols-1 gap-4 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:grid-cols-2 lg:gap-6">
      {isRejected && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 lg:col-span-2"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-bold">Bukti pembayaran ditolak</p>
              <p className="mt-0.5 text-sm text-red-800">
                Alasan: <strong>{order.alasanPenolakan || 'Perlu dicek ulang'}</strong>
              </p>
              <p className="mt-1 text-xs text-red-700">
                Unggah ulang foto bukti bayar yang benar di bawah ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Total + sisa waktu */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-stone-500">Total yang dibayar</p>
            <p className="mt-0.5 font-mono text-4xl font-bold tracking-tight text-stone-900 tabular-nums">
              {formatRupiah(order.totalHarga)}
            </p>
          </div>
          {isCounting && (
            <div className="text-right">
              <p className="text-xs font-medium text-stone-500">Sisa waktu</p>
              <p
                className={`mt-0.5 inline-flex items-center gap-1 font-mono text-xl font-bold tabular-nums ${
                  lowTime ? 'text-red-600' : 'text-stone-900'
                }`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{formatCountdown(remainingSeconds)}</span>
              </p>
            </div>
          )}
        </div>

        {isCounting && (
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-label="Sisa waktu pembayaran"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                lowTime ? 'bg-red-600' : 'bg-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <p className="mt-3 text-sm text-stone-600">
          Pesanan <span className="font-mono font-bold text-red-600">{order.nomorPesanan}</span>{' '}
          atas nama {order.nama}, diambil pukul {order.waktuAmbil} WIB.
        </p>
      </section>

      {/* QRIS */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:row-span-2 lg:p-7">
        <h2 className="text-base font-bold text-stone-900">Scan QRIS</h2>

        <div className="mt-3 rounded-2xl bg-stone-50 p-4 text-center">
          {qrisImage ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setZoomQris(true)}
                className="group relative mx-auto block rounded-2xl border border-stone-200 bg-white p-2 focus-visible:outline-2 focus-visible:outline-red-600"
                aria-label="Perbesar gambar QRIS"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisImage}
                  alt="Kode QRIS Toko Aci Rivi"
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-72 w-auto rounded-xl object-contain"
                />
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-600 group-hover:text-red-600">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ketuk untuk memperbesar</span>
                </span>
              </button>

              <a
                href={qrisImage}
                download={`QRIS-Aci-Rivi-${order.nomorPesanan.replace('#', '')}.jpg`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 active:bg-stone-200"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Simpan gambar QRIS</span>
              </a>
            </div>
          ) : (
            <div className="py-8">
              <QrCode className="mx-auto h-10 w-10 text-stone-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-stone-700">
                QRIS toko belum tersedia.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Tanyakan ke kasir, atau muat ulang halaman ini beberapa saat lagi.
              </p>
            </div>
          )}
        </div>

        <ol className="mt-4 space-y-2 text-sm text-stone-700">
          {[
            'Scan QRIS dengan aplikasi bank atau e-wallet.',
            'Bayar sesuai total di atas.',
            'Unggah tangkapan layar bukti bayar.',
            'Tekan "Saya sudah bayar".',
          ].map((text, i) => (
            <li key={text} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
                {i + 1}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Bukti bayar */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:p-7">
        <h2 className="text-base font-bold text-stone-900">
          Bukti bayar <span className="text-red-600">*</span>
        </h2>

        <label className="mt-3 flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-red-400 hover:bg-orange-50/50 active:bg-orange-50">
          <ImagePlus className="h-5 w-5 text-red-600" aria-hidden="true" />
          <span>
            {isCompressing
              ? 'Memproses foto...'
              : proofPreview
                ? 'Ganti foto bukti bayar'
                : 'Pilih foto bukti bayar'}
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
          <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-center">
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
          <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
            {uploadError}
          </p>
        )}
      </section>

      {/* Batalkan */}
      <div className="px-1 text-center lg:col-span-2">
        {confirmCancel ? (
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm font-semibold text-red-700">
              Batalkan pesanan ini?
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-[44px] rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 active:bg-red-800"
            >
              Ya, batalkan
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Tidak
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-stone-500 hover:text-red-600"
          >
            Batalkan pesanan
          </button>
        )}
      </div>

      {/* Bar aksi menempel di bawah */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:max-w-7xl lg:rounded-t-2xl lg:border-x">
        <div className="mx-auto flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs text-stone-500">Total</p>
            <p className="font-mono text-lg font-bold text-stone-900 tabular-nums">
              {formatRupiah(order.totalHarga)}
            </p>
          </div>
          <button
            type="button"
            disabled={!proofPreview || isCompressing || isSubmitting}
            onClick={handleSubmitProof}
            className="h-12 flex-1 rounded-2xl bg-red-600 px-5 text-base font-bold text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          >
            {isSubmitting
              ? 'Mengirim...'
              : proofPreview
                ? 'Saya sudah bayar'
                : 'Unggah bukti dulu'}
          </button>
        </div>
      </div>

      {/* Perbesar QRIS */}
      {zoomQris && qrisImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QRIS diperbesar"
          onClick={() => setZoomQris(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-lg rounded-3xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomQris(false)}
              aria-label="Tutup"
              className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200"
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