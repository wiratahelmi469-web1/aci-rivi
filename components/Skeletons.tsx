'use client';

import { RefreshCw } from 'lucide-react';

export function ToppingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Memuat daftar topping"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-3.5"
        >
          <div className="aspect-square w-full rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
          <div className="mt-3 h-4 w-3/4 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
          <div className="mt-2 h-3.5 w-1/2 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
          <div className="mt-3 h-11 w-full rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Memuat daftar pesanan"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-5 w-20 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-3.5 w-40 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="space-y-2 text-right">
              <div className="ml-auto h-5 w-24 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
              <div className="ml-auto h-3.5 w-28 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat pesanan">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center">
        <div className="mx-auto h-3.5 w-28 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
        <div className="mx-auto mt-3 h-12 w-32 rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
        <div className="mx-auto mt-4 h-4 w-52 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 space-y-4">
        <div className="h-5 w-36 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3.5">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-52 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div
      className="rounded-3xl border border-stone-200 bg-white p-6 space-y-4"
      aria-busy="true"
      aria-label="Memuat profil"
    >
      <div className="h-5 w-40 rounded-md bg-stone-200 animate-pulse motion-reduce:animate-none" />
      <div className="h-12 w-full rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
      <div className="h-12 w-full rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
      <div className="h-12 w-full rounded-xl bg-stone-200 animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

export function ErrorRetryCard({
  message = 'Gagal memuat',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-red-200 bg-white p-8 text-center"
    >
      <p className="text-base font-bold text-stone-900">{message}</p>
      <p className="mt-1 text-sm text-stone-600">
        Periksa koneksi internet kamu lalu coba lagi.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        <span>Coba Lagi</span>
      </button>
    </div>
  );
}
