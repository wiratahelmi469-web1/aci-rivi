'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import {
  addTopping,
  deleteTopping,
  getToppings,
  subscribeDataChanges,
  updateTopping,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/time';
import type { Topping } from '@/lib/types';

const EMOJI_PILIHAN = ['🍡', '🌭', '🍗', '🍜', '🍝', '🍘', '🥟', '🥚', '🍄', '🥬', '🧀', '🍤'];

export function KelolaStokView() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form tambah topping
  const [namaBaru, setNamaBaru] = useState('');
  const [emojiBaru, setEmojiBaru] = useState('🍲');
  const [hargaBaru, setHargaBaru] = useState('2000');
  const [stokBaru, setStokBaru] = useState('20');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const sync = () => setToppings(getToppings());
    sync();
    return subscribeDataChanges(sync);
  }, []);

  const handleTambahTopping = (e: React.FormEvent) => {
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

    addTopping({
      nama: namaClean,
      emoji: emojiBaru || '🍲',
      harga: hargaNum,
      stok: stokNum,
    });

    setNamaBaru('');
    setEmojiBaru('🍲');
    setHargaBaru('2000');
    setStokBaru('20');
    setFormError('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Daftar Topping ({toppings.length})
          </h2>
          <p className="text-sm text-stone-600">
            Stok 0 otomatis tampil &ldquo;Habis&rdquo; di menu pelanggan.
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
                htmlFor="tambah-emoji"
                className="block text-sm font-semibold text-stone-800"
              >
                Emoji
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="tambah-emoji"
                  type="text"
                  value={emojiBaru}
                  onChange={(e) => setEmojiBaru(e.target.value)}
                  className="h-12 w-16 rounded-xl border border-stone-300 bg-white text-center text-2xl focus:border-red-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1">
                  {EMOJI_PILIHAN.slice(0, 6).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmojiBaru(em)}
                      className={`h-10 w-10 rounded-lg border text-lg transition-colors ${
                        emojiBaru === em
                          ? 'border-red-500 bg-orange-50'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
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
          </div>

          {formError && (
            <p className="mt-3 text-sm font-semibold text-red-600">{formError}</p>
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
              className="min-h-[44px] rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Simpan Topping
            </button>
          </div>
        </form>
      )}

      {/* Daftar Topping */}
      {toppings.length === 0 ? (
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

            return (
              <div
                key={topping.id}
                className={`rounded-3xl border bg-white p-4 sm:p-5 ${
                  isOutOfStock ? 'border-stone-200 bg-stone-50/70' : 'border-stone-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {topping.emoji}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-stone-900">
                        {topping.nama}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {isOutOfStock
                          ? 'Tampil Habis di pelanggan'
                          : `Aktif · ${formatRupiah(topping.harga)}`}
                      </p>
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
