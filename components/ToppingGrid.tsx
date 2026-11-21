'use client';

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {toppings.map((topping) => {
        const isHabis = !topping.tersedia || topping.stok <= 0;
        const isSelected = !isHabis && selectedIds.includes(topping.id);
        const isLowStock =
          !isHabis && topping.stok <= BATAS_STOK_MENIPIS;

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
            className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
              isHabis
                ? 'cursor-not-allowed border-stone-200 bg-stone-100/90 opacity-75'
                : isSelected
                  ? 'border-red-500 bg-orange-50/70 shadow-sm ring-1 ring-red-500'
                  : 'border-stone-200 bg-white hover:border-orange-300 active:scale-[0.98]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-4xl leading-none select-none ${
                    isHabis ? 'grayscale' : ''
                  }`}
                  aria-hidden="true"
                >
                  {topping.emoji}
                </span>
                {isHabis ? (
                  <span className="text-xs font-semibold text-stone-500">
                    Habis
                  </span>
                ) : isLowStock ? (
                  <span className="text-xs font-semibold text-amber-700 tabular-nums">
                    Sisa {topping.stok}
                  </span>
                ) : null}
              </div>

              <h3
                className={`mt-3 text-base font-semibold leading-snug ${
                  isHabis ? 'text-stone-500' : 'text-stone-900'
                }`}
              >
                {topping.nama}
              </h3>

              <p
                className={`mt-1 font-mono text-sm font-semibold tabular-nums ${
                  isHabis ? 'text-stone-400' : 'text-orange-700'
                }`}
              >
                {formatRupiah(topping.harga)}
              </p>
            </div>

            <div
              className={`mt-4 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
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
