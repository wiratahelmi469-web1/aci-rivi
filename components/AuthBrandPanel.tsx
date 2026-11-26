import { UtensilsCrossed } from 'lucide-react';

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-[440px] flex-col justify-between overflow-hidden rounded-[32px] bg-red-600 p-10 text-white shadow-sm lg:flex xl:p-12">
      <span
        aria-hidden="true"
        className="absolute -right-20 -bottom-24 h-80 w-80 rounded-full bg-white/10"
      />
      <div className="relative flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 rounded-xl"
        />
        <span className="text-2xl font-extrabold tracking-tight">Aci Rivi</span>
      </div>

      <div className="relative max-w-lg">
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-red-600">
          <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight xl:text-5xl">
          Racik seblakmu sendiri
        </h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-red-50">
          Pilih topping seperti di prasmanan, tentukan jam ambil, lalu bayar lewat QRIS.
        </p>
      </div>

      <p className="relative text-sm font-medium text-red-100">
        Seblak prasmanan · Aci Rivi
      </p>
    </aside>
  );
}
