'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Minus, Plus, Trash2, X } from 'lucide-react';
import { ErrorRetryCard, ToppingGridSkeleton } from '@/components/Skeletons';
import { ToppingImage } from '@/components/ToppingImage';
import { compressToppingPhoto } from '@/lib/imageCompress';
import {
  addTopping,
  deleteTopping,
  getToppings,
  subscribeDataChanges,
  updateTopping,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Topping } from '@/lib/types';

export function KelolaStokView() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Form tambah topping
  const [namaBaru, setNamaBaru] = useState('');
  const [fotoBaru, setFotoBaru] = useState<string | undefined>(undefined);
  const [hargaBaru, setHargaBaru] = useState('2000');
  const [stokBaru, setStokBaru] = useState('20');
  const [formError, setFormError] = useState('');
  const [isCompressingNew, setIsCompressingNew] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);

  const sync = useCallback(() => {
    try {
      setToppings(getToppings());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(sync, 0);
    const unsub = subscribeDataChanges(sync);
    return () => {
      window.clearTimeout(initTimer);
      unsub();
    };
  }, [sync]);

  const handleUploadNewPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFormError('');
    setIsCompressingNew(true);
    try {
      const compressed = await compressToppingPhoto(file);
      setFotoBaru(compressed);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal memproses foto topping.'
      );
    } finally {
      setIsCompressingNew(false);
    }
  };

  const handleUploadExistingPhoto = async (
    toppingId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoErrors((prev) => ({ ...prev, [toppingId]: '' }));
    setUploadingId(toppingId);

    try {
      const compressed = await compressToppingPhoto(file);
      setPhotoPreviews((prev) => ({ ...prev, [toppingId]: compressed }));
    } catch (err) {
      setPhotoErrors((prev) => ({
        ...prev,
        [toppingId]:
          err instanceof Error ? err.message : 'Gagal memproses foto topping.',
      }));
    } finally {
      setUploadingId(null);
    }
  };

  const handleSaveExistingPhoto = async (toppingId: string) => {
    const foto = photoPreviews[toppingId];
    if (!foto) return;
    setPhotoErrors((prev) => ({ ...prev, [toppingId]: '' }));
    setUploadingId(toppingId);
    const result = await updateTopping(toppingId, { foto }, { immediate: true });
    setUploadingId(null);
    if (!result.ok) {
      setPhotoErrors((prev) => ({ ...prev, [toppingId]: result.error }));
      return;
    }
    setPhotoPreviews((prev) => {
      const next = { ...prev };
      delete next[toppingId];
      return next;
    });
  };

  const handleTambahTopping = async (e: React.FormEvent) => {
    e.preventDefault();
    const namaClean = namaBaru.trim();
    const hargaNum = Number(hargaBaru);
    const stokNum = Number(stokBaru);

    if (!namaClean) {
      setFormError('Nama topping wajib diisi.');
      return;
    }
    if (!Number.isFinite(hargaNum) || hargaNum < 0) {
      setFormError('Harga tidak valid.');
      return;
    }
    if (!Number.isFinite(stokNum) || stokNum < 0) {
      setFormError('Stok tidak valid.');
      return;
    }

    setIsSavingNew(true);
    try {
      const result = await addTopping({
        nama: namaClean,
        foto: fotoBaru,
        harga: hargaNum,
        stok: stokNum,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setNamaBaru('');
      setFotoBaru(undefined);
      setHargaBaru('2000');
      setStokBaru('20');
      setFormError('');
      setShowAddForm(false);
    } finally {
      setIsSavingNew(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Daftar Topping ({toppings.length})
          </h2>
          <p className="text-sm text-stone-600">
            Unggah foto asli topping, atur stok, dan perbarui harga jual.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError('');
            setShowAddForm(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Tambah Topping</span>
        </button>
      </div>

      {/* Form Tambah Topping */}
      {showAddForm && (
        <form
          onSubmit={handleTambahTopping}
          className="rounded-3xl border border-orange-200 bg-white p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <h3 className="text-base font-bold text-stone-900">
              Tambah Topping Baru
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              aria-label="Tutup form tambah topping"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tambah-nama"
                className="block text-sm font-semibold text-stone-800"
              >
                Nama Topping
              </label>
              <input
                id="tambah-nama"
                type="text"
                value={namaBaru}
                onChange={(e) => setNamaBaru(e.target.value)}
                placeholder="Contoh: Cuanki Lidah"
                className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="tambah-harga"
                className="block text-sm font-semibold text-stone-800"
              >
                Harga (Rp)
              </label>
              <input
                id="tambah-harga"
                type="number"
                min={0}
                step={500}
                value={hargaBaru}
                onChange={(e) => setHargaBaru(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 font-mono text-base text-stone-900 tabular-nums focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="tambah-stok"
                className="block text-sm font-semibold text-stone-800"
              >
                Stok Awal (porsi)
              </label>
              <input
                id="tambah-stok"
                type="number"
                min={0}
                value={stokBaru}
                onChange={(e) => setStokBaru(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 font-mono text-base text-stone-900 tabular-nums focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Unggah Foto untuk Topping Baru */}
            <div className="sm:col-span-2">
              <span className="block text-sm font-semibold text-stone-800">
                Foto Topping{' '}
                <span className="font-normal text-stone-500">(opsional)</span>
              </span>
              <div className="mt-1.5 flex items-center gap-4">
                <ToppingImage
                  src={fotoBaru}
                  alt={namaBaru || 'topping baru'}
                  sizes="80px"
                  className="h-20 w-20 shrink-0 rounded-2xl border border-stone-200"
                />

                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
                  <ImagePlus className="h-4 w-4 text-red-600" aria-hidden="true" />
                  <span>
                    {isCompressingNew
                      ? 'Memproses...'
                      : fotoBaru
                        ? 'Ganti Foto'
                        : 'Unggah Foto'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadNewPhoto}
                    disabled={isCompressingNew}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-sm font-semibold text-red-600">
              {formError}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isCompressingNew || isSavingNew}
              className="min-h-[44px] rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isSavingNew ? 'Menyimpan...' : 'Simpan Topping'}
            </button>
          </div>
        </form>
      )}

      {/* Daftar Topping */}
      {isLoading ? (
        <ToppingGridSkeleton count={6} />
      ) : loadError ? (
        <ErrorRetryCard message="Gagal memuat" onRetry={sync} />
      ) : toppings.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-stone-700">
            Belum ada topping.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {toppings.map((topping) => {
            const isOutOfStock = topping.stok <= 0 || !topping.tersedia;
            const isConfirmingDelete = confirmDeleteId === topping.id;
            const isUploading = uploadingId === topping.id;
            const photoErr = photoErrors[topping.id];
            const photoPreview = photoPreviews[topping.id];

            return (
              <div
                key={topping.id}
                className={`rounded-3xl border bg-white p-4 sm:p-5 ${
                  isOutOfStock
                    ? 'border-stone-200 bg-stone-50/70'
                    : 'border-stone-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ToppingImage
                      src={photoPreview ?? topping.imageUrl}
                      alt={topping.nama}
                      sizes="64px"
                      className="h-16 w-16 shrink-0 rounded-2xl border border-stone-200"
                    />

                    <div>
                      <h3 className="text-base font-bold text-stone-900">
                        {topping.nama}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {isOutOfStock
                          ? 'Tampil Habis di pelanggan'
                          : `Aktif · ${formatRupiah(topping.harga)}`}
                      </p>

                      <label className="mt-1.5 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                        <ImagePlus
                          className="h-3.5 w-3.5 text-red-600"
                          aria-hidden="true"
                        />
                        <span>
                          {isUploading
                            ? 'Memproses...'
                            : topping.imageUrl
                              ? 'Ganti Foto'
                              : 'Unggah Foto'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            handleUploadExistingPhoto(topping.id, e)
                          }
                          disabled={isUploading}
                          className="sr-only"
                        />
                      </label>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => handleSaveExistingPhoto(topping.id)}
                          disabled={isUploading}
                          className="ml-1 inline-flex min-h-[36px] items-center rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Saklar Tersedia */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-600">
                      Tersedia
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={topping.tersedia}
                      aria-label={`Tersedia untuk ${topping.nama}`}
                      onClick={() =>
                        updateTopping(topping.id, {
                          tersedia: !topping.tersedia,
                        })
                      }
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        topping.tersedia ? 'bg-red-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                          topping.tersedia ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {photoErr && (
                  <p
                    role="alert"
                    className="mt-2 text-xs font-semibold text-red-600"
                  >
                    {photoErr}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
                  {/* Kontrol Stok */}
                  <div>
                    <label
                      htmlFor={`stok-${topping.id}`}
                      className="block text-xs font-semibold text-stone-600"
                    >
                      Stok (porsi)
                    </label>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateTopping(topping.id, {
                            stok: Math.max(0, topping.stok - 1),
                          })
                        }
                        aria-label={`Kurangi stok ${topping.nama}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 active:scale-95"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <input
                        id={`stok-${topping.id}`}
                        type="number"
                        min={0}
                        value={topping.stok}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateTopping(topping.id, {
                            stok: Number.isFinite(val) ? Math.max(0, val) : 0,
                          });
                        }}
                        className="h-11 w-full rounded-xl border border-stone-300 bg-white px-2 text-center font-mono text-base font-bold text-stone-900 tabular-nums focus:border-red-500 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          updateTopping(topping.id, {
                            stok: topping.stok + 1,
                          })
                        }
                        aria-label={`Tambah stok ${topping.nama}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 active:scale-95"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Kontrol Harga */}
                  <div>
                    <label
                      htmlFor={`harga-${topping.id}`}
                      className="block text-xs font-semibold text-stone-600"
                    >
                      Harga (Rp)
                    </label>
                    <input
                      id={`harga-${topping.id}`}
                      type="number"
                      min={0}
                      step={500}
                      value={topping.harga}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateTopping(topping.id, {
                          harga: Number.isFinite(val) ? Math.max(0, val) : 0,
                        });
                      }}
                      className="mt-1.5 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 font-mono text-base font-bold text-stone-900 tabular-nums focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Hapus Topping */}
                <div className="mt-3 flex items-center justify-end">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-700">
                        Hapus topping ini?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          deleteTopping(topping.id);
                          setConfirmDeleteId(null);
                        }}
                        className="min-h-[36px] rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[36px] rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(topping.id)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hapus Topping</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
