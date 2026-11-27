'use client';

import { useEffect, useState } from 'react';
import { getStoreStatusWib } from '@/lib/time';

export interface StoreStatus {
  open: boolean;
  text: string;
}

export function useStatusToko(initialStatus: StoreStatus): StoreStatus {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const refresh = () => setStatus(getStoreStatusWib());
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return status;
}

interface StatusTokoProps {
  status: StoreStatus;
  inverted?: boolean;
}

export function StatusToko({
  status,
  inverted = false,
}: StatusTokoProps) {
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm ${
        inverted
          ? 'bg-white/15 text-white'
          : status.open
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-amber-50 text-amber-800'
      }`}
      aria-live="polite"
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          status.open
            ? inverted
              ? 'bg-emerald-300'
              : 'bg-emerald-500'
            : inverted
              ? 'bg-amber-300'
              : 'bg-amber-500'
        }`}
        aria-hidden="true"
      />
      {status.text}
    </span>
  );
}
