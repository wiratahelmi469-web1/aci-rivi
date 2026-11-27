'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard, ToppingGridSkeleton } from '@/components/Skeletons';
import { ToppingGrid } from '@/components/ToppingGrid';
import { PickupTimePicker } from '@/components/PickupTimePicker';
import {
  BATAS_JUMLAH_TOPPING,
  JAM_BUKA,
  JAM_TUTUP,
  MINIMAL_JEDA_MENIT,
} from '@/lib/constants';
import {
  createOnlineOrder,
  getToppings,
  subscribeDataChanges,
} from '@/lib/storage';
import { formatRupiah, generatePickupSlots } from '@/lib/time';
import type { Topping } from '@/lib/types';
import { getWhatsAppValidationError } from '@/lib/validation';

type Step = 'topping' | 'ringkasan';

const STEP_TITLES: Record<Step, string> = {
  topping: 'Pilih Topping',
  ringkasan: 'Ringkasan & Waktu Ambil',
};

export function PesanClient() {
  const router = useRouter();
  const { user, profile, authReady } = useCustomerAuth();

  const [step, setStep] = useState<Step>('topping');
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [toppingsLoading, setToppingsLoading] = useState(true);
  const [toppingsError, setToppingsError] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toppingError, setToppingError] = useState('');

  // Form Ringkasan & Waktu Pengambilan
  const [namaDraft, setNamaDraft] = useState<string | null>(null);
  const [waDraft, setWaDraft] = useState<string | null>(null);
  const nama = namaDraft ?? (profile?.nama || user?.displayName || '');
  const nomorWhatsApp = waDraft ?? (profile?.nomorWhatsApp || '');
  const [catatan, setCatatan] = useState('');
  const [waktuAmbil, setWaktuAmbil] = useState('');
  const [pickupSlots, setPickupSlots] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    nama?: string;
    nomorWhatsApp?: string;
    waktuAmbil?: string;
    topping?: string;
  }>({});
  const reorderApplied = useRef(false);

  // Wajib login untuk mengakses halaman pemesanan
  useEffect(() => {
    if (authReady && !user) {
      router.replace('/masuk?next=/pesan');
    }
  }, [authReady, user, router]);

  const syncToppings = useCallback(() => {
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
      setToppingsError(false);
    } catch {
      setToppingsError(true);
    } finally {
      setToppingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const initTimer = window.setTimeout(syncToppings, 0);
    const unsub = subscribeDataChanges(syncToppings);
    return () => {
      window.clearTimeout(initTimer);
      unsub();
    };
  }, [authReady, user, syncToppings]);

  useEffect(() => {
    if (toppingsLoading || reorderApplied.current) return;
    if (new URLSearchParams(window.location.search).get('ulang') !== '1') return;

    reorderApplied.current = true;
    const timer = window.setTimeout(() => {
      const stored = sessionStorage.getItem('aci-rivi-repeat-order');
      sessionStorage.removeItem('aci-rivi-repeat-order');
      try {
        const requested: unknown = stored ? JSON.parse(stored) : null;
        if (!Array.isArray(requested)) throw new Error('Data pesanan ulang tidak valid.');
        const next: Record<string, number> = {};
        for (const item of requested) {
          if (
            typeof item !== 'object' ||
            item === null ||
            !('id' in item) ||
            typeof item.id !== 'string' ||
            !('quantity' in item) ||
            typeof item.quantity !== 'number' ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
          ) {
            continue;
          }
          const topping = toppings.find((entry) => entry.id === item.id);
          if (topping?.tersedia && topping.stok > 0) {
            next[item.id] = Math.min(item.quantity, topping.stok, BATAS_JUMLAH_TOPPING);
          }
        }
        setQuantities(next);
        if (Object.keys(next).length === 0) {
          setToppingError('Topping dari pesanan sebelumnya sudah tidak tersedia.');
        }
      } catch (error) {
        console.error('reorder data invalid:', error instanceof Error ? error.message : error);
        setToppingError('Pesanan sebelumnya tidak dapat dimuat. Pilih topping secara manual.');
      } finally {
        router.replace('/pesan');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router, toppings, toppingsLoading]);

  useEffect(() => {
    const refreshSlots = () => {
      const slots = generatePickupSlots();
      setPickupSlots(slots);
      setWaktuAmbil((prev) => (prev && slots.includes(prev) ? prev : slots[0] ?? ''));
    };
    refreshSlots();
    const timer = window.setInterval(refreshSlots, 10_000);
    return () => window.clearInterval(timer);
  }, []);

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
    setToppingError('');
    setFieldErrors((prev) => ({ ...prev, topping: undefined }));
    setQuantities((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[topping.id] = quantity;
      else delete next[topping.id];
      return next;
    });
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

  const handleLanjutBayar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errors: typeof fieldErrors = {};
    if (selectedToppings.length === 0) {
      errors.topping = 'Pilih minimal 1 topping';
    }
    if (!nama.trim()) {
      errors.nama = 'Nama wajib diisi';
    }
    const waError = getWhatsAppValidationError(nomorWhatsApp);
    if (waError) {
      errors.nomorWhatsApp = waError;
    }
    if (!waktuAmbil) {
      errors.waktuAmbil = 'Pilih waktu pengambilan';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const result = await createOnlineOrder({
      nama,
      nomorWhatsApp,
      catatan,
      waktuAmbil,
      toppingItems: selectedToppings.map((t) => ({
        id: t.id,
        quantity: quantities[t.id],
      })),
    });

    if (!result.ok) {
      setToppingError(result.error);
      setStep('topping');
      return;
    }

    router.push(`/pesanan/${result.order.id}`);
  };

  if (!authReady || !user) {
    return (
      <div className="min-h-screen bg-[#F7F6F5]">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <ToppingGridSkeleton count={8} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F5] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <CustomerHeader />

      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {step === 'topping' ? (
            <Link
              href="/"
              className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Beranda</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep('topping')}
              className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Topping</span>
            </button>
          )}

          <h1 className="truncate text-sm font-bold text-stone-900">
            {STEP_TITLES[step]}
          </h1>

          <span className="font-mono text-xs font-semibold text-stone-500 tabular-nums">
            {step === 'topping' ? '1/3' : '2/3'}
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {step === 'topping' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">
                Racik Seblakmu Sendiri
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Atur jumlah tiap topping dengan tombol minus dan plus.
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

            {toppingsLoading ? (
              <ToppingGridSkeleton count={8} />
            ) : toppingsError ? (
              <ErrorRetryCard message="Gagal memuat" onRetry={syncToppings} />
            ) : (
              <ToppingGrid
                toppings={toppings}
                quantities={quantities}
                onQuantityChange={handleQuantityChange}
                onUnavailableTap={() =>
                  setToppingError('Topping ini sudah habis')
                }
              />
            )}
          </div>
        )}

        {step === 'ringkasan' && (
          <form onSubmit={handleLanjutBayar} className="w-full space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
            <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-start-1 lg:row-start-1 lg:p-7">
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <h2 className="text-base font-bold text-stone-900">
                  Topping Terpilih ({selectedToppings.reduce((sum, item) => sum + quantities[item.id], 0)})
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
                            {item.nama} x{quantities[item.id]}
                          </p>
                          <p className="font-mono text-xs text-stone-500 tabular-nums">
                            {formatRupiah(item.harga)} × {quantities[item.id]} = {formatRupiah(item.harga * quantities[item.id])}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          })
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

            <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-start-2 lg:row-start-1 lg:p-7">
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
                      setNamaDraft(e.target.value);
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
                    inputMode="numeric"
                    value={nomorWhatsApp}
                    onChange={(e) => {
                      setWaDraft(e.target.value);
                      if (fieldErrors.nomorWhatsApp) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          nomorWhatsApp: undefined,
                        }));
                      }
                    }}
                    placeholder="081234567890"
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
              } lg:col-start-1 lg:row-start-2 lg:p-7`}
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
                Hanya pengambilan di tempat (jeda persiapan {MINIMAL_JEDA_MENIT} menit).
              </p>

              {pickupSlots.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-stone-100 p-4 text-sm font-medium text-stone-700">
                  Jam buka hari ini ({JAM_BUKA}:00–{JAM_TUTUP}:00 WIB) sudah
                  berakhir untuk pemesanan online.
                </div>
              ) : (
                <div className="mt-4">
                  <PickupTimePicker
                    slots={pickupSlots}
                    value={waktuAmbil}
                    onChange={(slot) => {
                      setWaktuAmbil(slot);
                      if (fieldErrors.waktuAmbil) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          waktuAmbil: undefined,
                        }));
                      }
                    }}
                  />
                </div>
              )}

              {fieldErrors.waktuAmbil && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  {fieldErrors.waktuAmbil}
                </p>
              )}
            </section>

            <div className="flex flex-col-reverse gap-3 lg:col-span-2 lg:flex-row lg:justify-end">
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
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:max-w-7xl lg:rounded-t-2xl lg:border-x">
          <div className="mx-auto flex min-h-[72px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
            <div>
              <p className="font-mono text-base font-bold text-stone-900 tabular-nums">
                {selectedToppings.reduce((sum, item) => sum + quantities[item.id], 0)} topping · {formatRupiah(totalHarga)}
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
