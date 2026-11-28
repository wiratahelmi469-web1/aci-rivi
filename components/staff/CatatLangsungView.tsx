'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ErrorRetryCard, ToppingGridSkeleton } from '@/components/Skeletons';
import { ToppingGrid } from '@/components/ToppingGrid';
import { BATAS_JUMLAH_TOPPING } from '@/lib/constants';
import {
  createPrasmananOrder,
  getToppings,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Order, Topping } from '@/lib/types';

interface CatatLangsungViewProps {
  onBatal: () => void;
  onLihatPesananMasuk: () => void;
}

export function CatatLangsungView({
  onBatal,
  onLihatPesananMasuk,
}: CatatLangsungViewProps) {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [nama, setNama] = useState('');
  const [catatan, setCatatan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [namaError, setNamaError] = useState('');
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);

  const sync = useCallback(() => {
    try {
      const latest = getToppings();
      setToppings(latest);
      setQuantities((prev) =>
        Object.fromEntries(
          Object.entries(prev).flatMap(([id, quantity]) => {
            const item = latest.find((t) => t.id === id);
            if (!item || !item.tersedia || item.stok <= 0) return [];
            return [[id, Math.min(quantity, item.stok, BATAS_JUMLAH_TOPPING)]];
          })
        )
      );
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

  const selectedToppings = useMemo(
    () =>
      Object.keys(quantities)
        .filter((id) => quantities[id] > 0)
        .map((id) => toppings.find((t) => t.id === id))
        .filter((t): t is Topping => Boolean(t)),
    [quantities, toppings]
  );

  const totalHarga = useMemo(
    () => selectedToppings.reduce((sum, t) => sum + t.harga * quantities[t.id], 0),
    [selectedToppings, quantities]
  );

  const handleQuantityChange = (topping: Topping, quantity: number) => {
    setErrorMsg('');
    setQuantities((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[topping.id] = quantity;
      else delete next[topping.id];
      return next;
    });
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!nama.trim()) {
      setNamaError('Nama pelanggan wajib diisi.');
      hasError = true;
    } else {
      setNamaError('');
    }

    if (selectedToppings.length === 0) {
      setErrorMsg('Pilih minimal 1 topping.');
      hasError = true;
    } else {
      setErrorMsg('');
    }

    if (hasError) return;

    const result = await createPrasmananOrder({
      nama,
      catatan,
      daftarTopping: selectedToppings.map((t) => ({
        id: t.id,
        nama: t.nama,
        imageUrl: t.imageUrl,
        harga: t.harga,
        quantity: quantities[t.id],
      })),
    });

    if (!result.ok) {
      setErrorMsg(result.error);
      return;
    }

    setSavedOrder(result.order);
  };

  const resetForm = () => {
    setSavedOrder(null);
    setQuantities({});
    setNama('');
    setCatatan('');
    setErrorMsg('');
    setNamaError('');
  };

  if (savedOrder) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-xs sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-xl font-bold text-stone-900">
          Pesanan Langsung Tersimpan
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Pesanan sudah masuk ke antrean Pesanan Masuk dan stok telah dikurangi.
        </p>

        <div className="mt-6 rounded-2xl bg-orange-50/70 p-5">
          <p className="text-xs font-semibold text-stone-600">Nomor Pesanan</p>
          <p className="mt-1 font-mono text-5xl font-bold text-red-600 tabular-nums">
            {savedOrder.nomorPesanan}
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-900">
            {savedOrder.nama} · {formatRupiah(savedOrder.totalHarga)}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={resetForm}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700"
          >
            Catat Pesanan Baru
          </button>
          <button
            type="button"
            onClick={onLihatPesananMasuk}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Lihat Pesanan Masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSimpan} className="space-y-6">
      {/* Input Nama & Catatan */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-bold text-stone-900">
          Data Pelanggan Prasmanan
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prasmanan-nama"
              className="block text-sm font-semibold text-stone-800"
            >
              Nama Pelanggan <span className="text-red-600">*</span>
            </label>
            <input
              id="prasmanan-nama"
              type="text"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (namaError) setNamaError('');
              }}
              placeholder="Contoh: Mba Rina"
              className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-base text-stone-900 focus:outline-none ${
                namaError
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-stone-300 focus:border-red-500'
              }`}
            />
            {namaError && (
              <p className="mt-1.5 text-xs font-semibold text-red-600">
                {namaError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="prasmanan-catatan"
              className="block text-sm font-semibold text-stone-800"
            >
              Catatan <span className="font-normal text-stone-500">(opsional)</span>
            </label>
            <input
              id="prasmanan-catatan"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Level 3, kuah sedeng"
              className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Pilih Topping */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">
            Pilih Topping Prasmanan
          </h2>
          <span className="font-mono text-sm font-semibold text-red-600 tabular-nums">
            {selectedToppings.reduce((sum, item) => sum + quantities[item.id], 0)} topping · {formatRupiah(totalHarga)}
          </span>
        </div>

        {isLoading ? (
          <ToppingGridSkeleton count={8} />
        ) : loadError ? (
          <ErrorRetryCard message="Gagal memuat" onRetry={sync} />
        ) : (
          <ToppingGrid
            toppings={toppings}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            onUnavailableTap={() => setErrorMsg('Topping ini sudah habis')}
          />
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* Aksi Simpan & Batal */}
      <div className="flex flex-col-reverse gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-stone-500">Total Tagihan Kasir</p>
          <p className="font-mono text-xl font-bold text-stone-900 tabular-nums">
            {selectedToppings.reduce((sum, item) => sum + quantities[item.id], 0)} topping · {formatRupiah(totalHarga)}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBatal}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 text-sm font-semibold text-stone-700 hover:bg-stone-50 sm:flex-none"
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-red-600 px-8 text-sm font-bold text-white hover:bg-red-700 active:scale-[0.98] sm:flex-none"
          >
            Simpan
          </button>
        </div>
      </div>
    </form>
  );
}
