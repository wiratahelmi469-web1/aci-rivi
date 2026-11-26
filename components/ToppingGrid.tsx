'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { BATAS_STOK_MENIPIS } from '@/lib/constants';
import { formatRupiah } from '@/lib/time';
import type { Topping } from '@/lib/types';

interface ToppingGridProps {
  toppings: Topping[];
  selectedIds: string[];
  onToggle: (topping: Topping) => void;
  onUnavailableTap?: (topping: Topping) => void;
}

export function ToppingGrid({
  toppings,
  selectedIds,
  onToggle,
  onUnavailableTap,
}: ToppingGridProps) {
  const [failedPhotoIds, setFailedPhotoIds] = useState<Record<string, boolean>>(
    {}
  );

  if (toppings.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-base font-medium text-stone-700">
          Belum ada daftar topping tersedia.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {toppings.map((topping) => {
        const isHabis = !topping.tersedia || topping.stok <= 0;
        const isSelected = !isHabis && selectedIds.includes(topping.id);
        const isLowStock = !isHabis && topping.stok <= BATAS_STOK_MENIPIS;
        const showPhoto = Boolean(topping.foto) && !failedPhotoIds[topping.id];

        return (
          <button
            key={topping.id}
            type="button"
            onClick={() => {
              if (isHabis) {
                onUnavailableTap?.(topping);
                return;
              }
              onToggle(topping);
            }}
            aria-pressed={isSelected}
            className={`group flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:p-3.5 ${
              isHabis
                ? 'cursor-not-allowed border-stone-200 bg-stone-100/90 opacity-75'
                : isSelected
                  ? 'border-red-500 bg-orange-50/70 shadow-xs ring-1 ring-red-500'
                  : 'border-stone-200 bg-white hover:border-orange-300 active:scale-[0.98] lg:hover:-translate-y-1 lg:hover:shadow-md'
            }`}
          >
            <div className="w-full">
              {/* Gambar Utama Persegi dengan Lazy Loading (Emoji sebagai cadangan) */}
              <div
                className={`relative aspect-square w-full overflow-hidden rounded-xl bg-stone-100 ${
                  isHabis ? 'grayscale' : ''
                }`}
              >
                {showPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={topping.foto}
                    alt={topping.nama}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedPhotoIds((prev) => ({
                        ...prev,
                        [topping.id]: true,
                      }))
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-orange-50/60">
                    <span
                      className="text-5xl leading-none select-none"
                      aria-hidden="true"
                    >
                      {topping.emoji || '🍲'}
                    </span>
                  </div>
                )}

                {isHabis && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/45">
                    <span className="rounded-lg bg-stone-900/85 px-2.5 py-1 text-xs font-bold text-white">
                      Habis
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-1.5">
                <h3
                  className={`truncate text-base font-semibold leading-snug ${
                    isHabis ? 'text-stone-500' : 'text-stone-900'
                  }`}
                >
                  {topping.nama}
                </h3>
                {isLowStock && (
                  <span className="shrink-0 text-xs font-semibold text-amber-700 tabular-nums">
                    Sisa {topping.stok}
                  </span>
                )}
              </div>

              <p
                className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                  isHabis ? 'text-stone-400' : 'text-orange-700'
                }`}
              >
                {formatRupiah(topping.harga)}
              </p>
            </div>

            <div
              className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                isHabis
                  ? 'bg-stone-200 text-stone-500'
                  : isSelected
                    ? 'bg-red-600 text-white'
                    : 'bg-orange-50 text-red-700 group-hover:bg-orange-100'
              }`}
            >
              {isHabis ? (
                <span>Habis</span>
              ) : isSelected ? (
                <>
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Dipilih</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Tambah</span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
