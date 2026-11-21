'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { ToppingGrid } from '@/components/ToppingGrid';
import { JAM_BUKA, JAM_TUTUP } from '@/lib/constants';
import {
  createOnlineOrder,
  getToppings,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah, generatePickupSlots } from '@/lib/time';
import type { Topping } from '@/lib/types';

type Step = 'topping' | 'ringkasan';

const STEP_TITLES: Record<Step, string> = {
  topping: 'Pilih Topping',
  ringkasan: 'Ringkasan & Waktu Ambil',
};

export default function PesanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('topping');
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toppingError, setToppingError] = useState('');

  // Form Ringkasan & Waktu Pengambilan
  const [nama, setNama] = useState('');
  const [nomorWhatsApp, setNomorWhatsApp] = useState('');
  const [catatan, setCatatan] = useState('');
  const [waktuAmbil, setWaktuAmbil] = useState('');
  const [pickupSlots, setPickupSlots] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    nama?: string;
    nomorWhatsApp?: string;
    waktuAmbil?: string;
    topping?: string;
  }>({});

  // Sinkronisasi daftar topping secara langsung
  useEffect(() => {
    const syncToppings = () => {
      const latest = getToppings();
      setToppings(latest);
      setSelectedIds((prev) =>
        prev.filter((id) => {
          const item = latest.find((t) => t.id === id);
          return item && item.tersedia && item.stok > 0;
        })
      );
    };
    syncToppings();
    return subscribeDataChanges(syncToppings);
  }, []);

  // Perbarui pilihan jam pengambilan setiap 30 detik agar slot lewat hilang otomatis
  useEffect(() => {
    const refreshSlots = () => {
      const slots = generatePickupSlots();
      setPickupSlots(slots);
      setWaktuAmbil((prev) => (prev && !slots.includes(prev) ? '' : prev));
    };
    refreshSlots();
    const timer = window.setInterval(refreshSlots, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedToppings = useMemo(
    () =>
      selectedIds
        .map((id) => toppings.find((t) => t.id === id))
        .filter((t): t is Topping => Boolean(t)),
    [selectedIds, toppings]
  );

  const totalHarga = useMemo(
    () => selectedToppings.reduce((sum, t) => sum + t.harga, 0),
    [selectedToppings]
  );

  const handleToggleTopping = (topping: Topping) => {
    setToppingError('');
    setFieldErrors((prev) => ({ ...prev, topping: undefined }));
    setSelectedIds((prev) =>
      prev.includes(topping.id)
        ? prev.filter((id) => id !== topping.id)
        : [...prev, topping.id]
    );
  };

  const handleLanjutDariTopping = () => {
    if (selectedToppings.length === 0) {
      setToppingError('Pilih minimal 1 topping');
      return;
    }
    setToppingError('');
    setStep('ringkasan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLanjutBayar = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    if (selectedToppings.length === 0) {
      errors.topping = 'Pilih minimal 1 topping';
    }
    if (!nama.trim()) {
      errors.nama = 'Nama wajib diisi';
    }
    const cleanPhone = nomorWhatsApp.replace(/\D/g, '');
    if (!nomorWhatsApp.trim()) {
      errors.nomorWhatsApp = 'Nomor WhatsApp wajib diisi';
    } else if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      errors.nomorWhatsApp = 'Masukkan nomor WhatsApp yang valid (minimal 9 digit)';
    }
    if (!waktuAmbil) {
      errors.waktuAmbil = 'Pilih waktu pengambilan';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Buat pesanan berstatus "Menunggu Pembayaran" (belum masuk ke pegawai)
    const created = createOnlineOrder({
      nama,
      nomorWhatsApp,
      catatan,
      waktuAmbil,
      daftarTopping: selectedToppings.map((t) => ({
        id: t.id,
        nama: t.nama,
        emoji: t.emoji,
        harga: t.harga,
      })),
    });

    router.push(`/pesanan/${created.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F5] pb-24">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          {step === 'topping' ? (
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Beranda</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep('topping')}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Topping</span>
            </button>
          )}

          <h1 className="truncate text-base font-bold text-stone-900">
            {STEP_TITLES[step]}
          </h1>

          <span className="font-mono text-xs font-semibold text-stone-500 tabular-nums">
            {step === 'topping' ? '1/3' : '2/3'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* LANGKAH 1: PILIH TOPPING */}
        {step === 'topping' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">
                Racik Seblakmu Sendiri
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Ketuk topping yang ingin ditambahkan. Ketuk lagi untuk membatalkan.
              </p>
            </div>

            {toppingError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{toppingError}</span>
              </div>
            )}

            <ToppingGrid
              toppings={toppings}
              selectedIds={selectedIds}
              onToggle={handleToggleTopping}
              onUnavailableTap={() => setToppingError('Topping ini sudah habis')}
            />
          </div>
        )}

        {/* LANGKAH 2: RINGKASAN & WAKTU PENGAMBILAN */}
        {step === 'ringkasan' && (
          <form onSubmit={handleLanjutBayar} className="mx-auto max-w-2xl space-y-5">
            <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <h2 className="text-base font-bold text-stone-900">
                  Topping Terpilih ({selectedToppings.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setStep('topping')}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  + Ubah Topping
                </button>
              </div>

              {selectedToppings.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm font-semibold text-red-600">
                    Pilih minimal 1 topping
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep('topping')}
                    className="mt-3 min-h-[44px] rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white"
                  >
                    Pilih Topping
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {selectedToppings.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.foto}
                            alt={item.nama}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-xl" aria-hidden="true">
                            {item.emoji}
                          </span>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {item.nama}
                          </p>
                          <p className="font-mono text-xs text-stone-500 tabular-nums">
                            {formatRupiah(item.harga)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds((prev) =>
                            prev.filter((id) => id !== item.id)
                          )
                        }
                        aria-label={`Hapus ${item.nama}`}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-xs font-semibold text-stone-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {fieldErrors.topping && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  {fieldErrors.topping}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3">
                <span className="text-base font-bold text-stone-900">
                  Total Harga
                </span>
                <span className="font-mono text-xl font-bold text-red-600 tabular-nums">
                  {formatRupiah(totalHarga)}
                </span>
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-stone-900">
                Data Pengambilan
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="order-nama"
                    className="block text-sm font-semibold text-stone-800"
                  >
                    Nama <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="order-nama"
                    type="text"
                    value={nama}
                    onChange={(e) => {
                      setNama(e.target.value);
                      if (fieldErrors.nama) {
                        setFieldErrors((prev) => ({ ...prev, nama: undefined }));
                      }
                    }}
                    placeholder="Contoh: Nadia"
                    className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-base text-stone-900 focus:outline-none ${
                      fieldErrors.nama
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-stone-300 focus:border-red-500'
                    }`}
                  />
                  {fieldErrors.nama && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">
                      {fieldErrors.nama}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="order-wa"
                    className="block text-sm font-semibold text-stone-800"
                  >
                    Nomor WhatsApp <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="order-wa"
                    type="tel"
                    inputMode="tel"
                    value={nomorWhatsApp}
                    onChange={(e) => {
                      setNomorWhatsApp(e.target.value);
                      if (fieldErrors.nomorWhatsApp) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          nomorWhatsApp: undefined,
                        }));
                      }
                    }}
                    placeholder="Contoh: 081234567890"
                    className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 font-mono text-base text-stone-900 placeholder:font-sans focus:outline-none ${
                      fieldErrors.nomorWhatsApp
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-stone-300 focus:border-red-500'
                    }`}
                  />
                  {fieldErrors.nomorWhatsApp && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">
                      {fieldErrors.nomorWhatsApp}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="order-catatan"
                    className="block text-sm font-semibold text-stone-800"
                  >
                    Catatan{' '}
                    <span className="font-normal text-stone-500">(opsional)</span>
                  </label>
                  <input
                    id="order-catatan"
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Pedas sedang, kuah agak banyak"
                    className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section
              className={`rounded-3xl border bg-white p-5 sm:p-6 ${
                fieldErrors.waktuAmbil
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  Pilih Waktu Pengambilan <span className="text-red-600">*</span>
                </h2>
                <span className="text-xs text-stone-500">
                  Buka {JAM_BUKA}:00–{JAM_TUTUP}:00 WIB
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                Hanya pengambilan di tempat (minimal 20 menit dari sekarang).
              </p>

              {pickupSlots.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-stone-100 p-4 text-sm font-medium text-stone-700">
                  Jam buka hari ini ({JAM_BUKA}:00–{JAM_TUTUP}:00 WIB) sudah
                  berakhir untuk pemesanan online.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {pickupSlots.map((slot) => {
                    const isSelected = waktuAmbil === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setWaktuAmbil(slot);
                          if (fieldErrors.waktuAmbil) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              waktuAmbil: undefined,
                            }));
                          }
                        }}
                        className={`flex min-h-[48px] items-center justify-center rounded-xl border font-mono text-sm font-bold tabular-nums transition-colors ${
                          isSelected
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}

              {fieldErrors.waktuAmbil && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  {fieldErrors.waktuAmbil}
                </p>
              )}
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                href="/"
                className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 text-base font-bold text-stone-700 hover:bg-stone-50"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={pickupSlots.length === 0}
                className="flex h-14 flex-[2] items-center justify-center rounded-2xl bg-red-600 px-6 text-base font-bold text-white shadow-xs transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 active:scale-[0.99]"
              >
                Lanjut Bayar · {formatRupiah(totalHarga)}
              </button>
            </div>
          </form>
        )}
      </main>

      {step === 'topping' && (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <div>
              <p className="font-mono text-base font-bold text-stone-900 tabular-nums">
                {selectedToppings.length} topping · {formatRupiah(totalHarga)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLanjutDariTopping}
              className="flex h-12 min-w-[128px] items-center justify-center rounded-xl bg-red-600 px-6 text-base font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98] whitespace-nowrap"
            >
              Lanjut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
