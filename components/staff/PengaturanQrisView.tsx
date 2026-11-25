"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ImagePlus, QrCode } from "lucide-react";
import { compressQrisPhoto } from "@/lib/imageCompress";
import {
  getStoreSettings,
  saveQrisImage,
  subscribeDataChanges,
} from "@/lib/storage";
import { formatTanggalJamWib } from "@/lib/time";

export function PengaturanQrisView() {
  const [qrisImage, setQrisImage] = useState<string | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const sync = () => {
      const settings = getStoreSettings();
      setQrisImage(settings.qrisImage);
      setUpdatedAt(settings.qrisUpdatedAt);
    };
    sync();
    return subscribeDataChanges(sync);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg("");
    setSavedNotice(false);
    setIsProcessing(true);

    try {
      const compressed = await compressQrisPhoto(file);
      const res = await saveQrisImage(compressed);
      if (!res.ok) throw new Error(res.error);
      const settings = getStoreSettings();
      setQrisImage(settings.qrisImage ?? compressed);
      setUpdatedAt(settings.qrisUpdatedAt ?? new Date().toISOString());
      setSavedNotice(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan gambar QRIS.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900">Gambar QRIS Toko</h2>
        <p className="mt-1 text-sm text-stone-600">
          Unggah gambar kode QRIS resmi toko Aci Rivi. Gambar ini akan
          ditampilkan langsung ke pelanggan saat membayar.
        </p>

        <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-center">
          {qrisImage ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrisImage}
                alt="QRIS Toko Aci Rivi"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-80 w-auto rounded-xl border border-stone-200 bg-white object-contain p-2"
              />
              {updatedAt && (
                <p className="text-xs text-stone-500">
                  Terakhir diperbarui: {formatTanggalJamWib(updatedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="py-10">
              <QrCode
                className="mx-auto h-12 w-12 text-stone-300"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-semibold text-stone-700">
                Belum ada gambar QRIS diunggah
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Unggah foto atau tangkapan layar QRIS toko agar pelanggan dapat
                membayar.
              </p>
            </div>
          )}
        </div>

        {errorMsg && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
            {errorMsg}
          </p>
        )}

        {savedNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Gambar QRIS berhasil disimpan.</span>
          </div>
        )}

        <label className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-colors hover:bg-red-700">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          <span>
            {isProcessing
              ? "Memproses gambar..."
              : qrisImage
                ? "Ganti Gambar QRIS"
                : "Unggah Gambar QRIS"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isProcessing}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
