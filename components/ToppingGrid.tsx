'use client';

import { Minus, Plus } from 'lucide-react';
import { BATAS_JUMLAH_TOPPING, BATAS_STOK_MENIPIS } from '@/lib/constants';
import { formatRupiah } from '@/lib/time';
import type { Topping } from '@/lib/types';
import { ToppingImage } from '@/components/ToppingImage';

interface ToppingGridProps {
  toppings: Topping[];
  quantities: Record<string, number>;
  onQuantityChange: (topping: Topping, quantity: number) => void;
  onUnavailableTap?: (topping: Topping) => void;
}

export function ToppingGrid({
  toppings,
  quantities,
  onQuantityChange,
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {toppings.map((topping) => {
        const isHabis = !topping.tersedia || topping.stok <= 0;
        const quantity = quantities[topping.id] ?? 0;
        const maxQuantity = Math.min(BATAS_JUMLAH_TOPPING, topping.stok);
        const isSelected = quantity > 0;
        const isLowStock = !isHabis && topping.stok <= BATAS_STOK_MENIPIS;
        return (
          <article
            key={topping.id}
            className={`group flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-150 sm:p-3.5 ${
              isHabis
                ? 'cursor-not-allowed border-stone-200 bg-stone-100/90 opacity-75'
                : isSelected
                  ? 'border-red-500 bg-orange-50/70 shadow-xs ring-1 ring-red-500'
                  : 'border-stone-200 bg-white hover:border-orange-300 lg:hover:-translate-y-1 lg:hover:shadow-md'
            }`}
          >
            <div className="w-full">
              <div className={`relative ${isHabis ? 'grayscale' : ''}`}>
                <ToppingImage
                  src={topping.imageUrl}
                  alt={topping.nama}
                  sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 23vw"
                />
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
              className={`mt-3 flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold whitespace-nowrap ${
                isHabis
                  ? 'bg-stone-200 text-stone-500'
                  : isSelected
                    ? 'bg-red-50 text-red-700'
                    : 'bg-orange-50 text-red-700'
              }`}
            >
              {isHabis ? (
                <button
                  type="button"
                  onClick={() => onUnavailableTap?.(topping)}
                  className="w-full py-1"
                >
                  Habis
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={quantity <= 0}
                    onClick={() => onQuantityChange(topping, Math.max(0, quantity - 1))}
                    aria-label={`Kurangi ${topping.nama}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-0 flex-1 text-center font-mono tabular-nums">
                    {quantity === 0 ? 'Tambah' : `x${quantity}`}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= maxQuantity}
                    onClick={() => onQuantityChange(topping, Math.min(maxQuantity, quantity + 1))}
                    aria-label={`Tambah ${topping.nama}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
