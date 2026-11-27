'use client';

import Link from 'next/link';
import { ArrowRight, Eye } from 'lucide-react';
import { JAM_BUKA, JAM_TUTUP } from '@/lib/constants';
import { StatusToko, useStatusToko } from './StatusToko';

interface HeroTamuProps {
  initialOpen: boolean;
  statusText: string;
}

export function HeroTamu({ initialOpen, statusText }: HeroTamuProps) {
  const status = useStatusToko({ open: initialOpen, text: statusText });
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-red-600 px-5 py-8 text-white shadow-sm sm:px-8 sm:py-10 lg:grid lg:min-h-[420px] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:rounded-[36px] lg:px-14">
      <div className="absolute -right-20 -bottom-24 h-64 w-64 rounded-full border-[32px] border-white/10 sm:h-80 sm:w-80" aria-hidden="true" />
      <div className="relative z-10 max-w-2xl">
        <StatusToko status={status} inverted />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-red-100">
          Seblak prasmanan Aci Rivi
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight [text-wrap:balance] min-[380px]:text-4xl sm:text-5xl lg:text-[3.4rem]">
          Pilih Topping Seblak Sendiri, Ambil Tanpa Antre
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-red-50 sm:text-base">
          Racik seblak sesuai selera, pilih waktu pengambilan, lalu bayar praktis lewat QRIS.
        </p>
        <div className="mt-6 flex flex-col gap-3 min-[400px]:flex-row">
          <Link
            href="/masuk?next=%2Fpesan"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-red-700 shadow-sm transition hover:bg-orange-50 sm:min-h-14 sm:px-6 sm:text-base"
          >
            Pesan Sekarang
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href="#pilihan-topping"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/20 sm:min-h-14 sm:px-6 sm:text-base"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Lihat Topping
          </a>
        </div>
        <p className="mt-5 text-xs font-medium text-red-100">
          Operasional setiap hari pukul {JAM_BUKA}:00–{JAM_TUTUP}:00 WIB
        </p>
      </div>
      <div className="relative z-10 mt-8 hidden items-center justify-center lg:flex">
        <div className="flex aspect-square w-full max-w-[330px] items-center justify-center rounded-full border border-white/20 bg-white/10">
          <div className="flex h-[78%] w-[78%] items-center justify-center rounded-full bg-white/10 text-8xl" aria-hidden="true">
            🍲
          </div>
        </div>
      </div>
    </section>
  );
}
