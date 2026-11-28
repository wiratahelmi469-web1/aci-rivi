import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatRupiah } from '@/lib/time';
import { ToppingImage } from '@/components/ToppingImage';

export interface ToppingPreview {
  id: string;
  nama: string;
  imageUrl?: string;
  harga: number;
  terjual?: number;
}

interface PratinjauToppingProps {
  toppings: ToppingPreview[];
  loadError?: boolean;
  href?: string;
  title?: string;
  eyebrow?: string;
  actionLabel?: string;
  emptyMessage?: string;
  errorMessage?: string;
}

export function PratinjauTopping({
  toppings,
  loadError = false,
  href = '/masuk?next=%2Fpesan',
  title = 'Pilihan Topping',
  eyebrow = 'Pilih sesuai selera',
  actionLabel = 'Lihat semua dan mulai racik',
  emptyMessage = 'Belum ada topping tersedia.',
  errorMessage = 'Pilihan topping belum dapat dimuat. Coba muat ulang halaman.',
}: PratinjauToppingProps) {
  return (
    <section id="pilihan-topping" aria-labelledby="judul-pilihan-topping" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">{eyebrow}</p>
          <h2 id="judul-pilihan-topping" className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            {title}
          </h2>
        </div>
        <span className="text-xs font-medium text-stone-500">Harga per porsi</span>
      </div>

      {loadError ? (
        <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : toppings.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-semibold text-stone-800">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 min-[540px]:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {toppings.map((topping) => (
            <li key={topping.id} className="min-w-0">
              <Link
                href={href}
                aria-label={`${href.startsWith('/masuk') ? 'Masuk untuk memesan' : 'Pesan'} ${topping.nama}`}
                className="group block h-full rounded-2xl border border-stone-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:p-3"
              >
                <div className="relative">
                  <ToppingImage
                    src={topping.imageUrl}
                    alt={topping.nama}
                    sizes="(max-width: 539px) 46vw, (max-width: 1023px) 30vw, 23vw"
                    className="bg-orange-50 transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute right-2 bottom-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-red-700 shadow-sm">
                    {topping.terjual !== undefined ? `${topping.terjual} terjual` : 'Pilih topping'}
                  </span>
                </div>
                <h3 className="mt-2 truncate text-sm font-bold text-stone-900 sm:text-base">{topping.nama}</h3>
                <p className="mt-0.5 font-mono text-xs font-semibold text-orange-700 tabular-nums sm:text-sm">
                  {formatRupiah(topping.harga)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-red-700 hover:underline"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
