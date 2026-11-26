'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellRing, Volume2, VolumeX } from 'lucide-react';
import {
  getPendingPaymentOrders,
  getStaffOrders,
  isOrdersReady,
  subscribeDataChanges,
} from '@/lib/storage';
import {
  getSoundEnabled,
  isAudioReady,
  playOrderAlert,
  playPaymentAlert,
  playTestSound,
  setSoundEnabled,
  subscribeAudio,
  unlockAudio,
  wasConfirmedHere,
} from '@/lib/staffAlerts';

const REPEAT_MS = 60_000;

function useAudioState() {
  const enabled = useSyncExternalStore(subscribeAudio, getSoundEnabled, () => true);
  const ready = useSyncExternalStore(subscribeAudio, isAudioReady, () => false);
  return { enabled, ready };
}

export function StaffSoundToggle() {
  const { enabled } = useAudioState();

  const toggle = async () => {
    const next = !enabled;
    setSoundEnabled(next);
    if (next) {
      await unlockAudio();
      void playTestSound();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-stone-600 whitespace-nowrap hover:text-red-600"
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <VolumeX className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{enabled ? 'Suara aktif' : 'Suara mati'}</span>
    </button>
  );
}

export function StaffNotifier() {
  const pathname = usePathname();
  const { enabled, ready } = useAudioState();
  const [pendingCount, setPendingCount] = useState(0);

  const pendingRef = useRef(0);
  const seenPending = useRef<Set<string> | null>(null);
  const seenPaid = useRef<Set<string> | null>(null);

  // Sentuhan pertama membuka izin suara di browser
  useEffect(() => {
    const unlock = () => {
      void unlockAudio();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Pantau data dan bunyikan saat ada yang baru
  useEffect(() => {
    const check = () => {
      if (!isOrdersReady()) return;

      const pending = getPendingPaymentOrders();
      const paid = getStaffOrders().filter(
        (o) => o.sumber === 'Online' && o.statusBayar === 'Lunas'
      );
      pendingRef.current = pending.length;
      setPendingCount(pending.length);

      const pendingIds = new Set(pending.map((o) => o.id));
      const paidIds = new Set(paid.map((o) => o.id));

      // Pembacaan pertama hanya menjadi acuan, tanpa bunyi
      if (seenPending.current === null || seenPaid.current === null) {
        seenPending.current = pendingIds;
        seenPaid.current = paidIds;
        return;
      }

      const newPending = pending.filter((o) => !seenPending.current!.has(o.id));
      const newPaid = paid.filter(
        (o) =>
          o.statusPesanan === 'Baru' &&
          !seenPaid.current!.has(o.id) &&
          !wasConfirmedHere(o.id)
      );

      seenPending.current = pendingIds;
      seenPaid.current = new Set([...seenPaid.current, ...paidIds]);

      if (newPending.length > 0) void playPaymentAlert();
      else if (newPaid.length > 0) void playOrderAlert();
    };

    const t = window.setTimeout(check, 0);
    const unsub = subscribeDataChanges(check);
    return () => {
      window.clearTimeout(t);
      unsub();
    };
  }, []);

  // Ingatkan lagi tiap menit selama masih ada pembayaran yang belum dicek
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (pendingRef.current > 0 && document.visibilityState === 'visible') {
        void playPaymentAlert();
      }
    }, REPEAT_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  // Angka di judul tab
  useEffect(() => {
    const strip = (t: string) => t.replace(/^\(\d+\)\s/, '');
    const base = strip(document.title);
    document.title = pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
    return () => {
      document.title = strip(document.title);
    };
  }, [pendingCount, pathname]);

  // Jaga layar tetap menyala selama suara aktif (jika perangkat mendukung)
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
        } else {
          lock = sentinel;
        }
      } catch {
        // izin ditolak atau tidak didukung
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [enabled]);

  const showPaymentToast = pendingCount > 0 && pathname !== '/pegawai/pembayaran';
  const showUnlockHint = enabled && !ready;

  if (!showPaymentToast && !showUnlockHint) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md flex-col gap-2">
      {showUnlockHint && (
        <p
          role="status"
          className="pointer-events-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
        >
          Ketuk layar sekali untuk mengaktifkan suara notifikasi.
        </p>
      )}

      {showPaymentToast && (
        <Link
          href="/pegawai/pembayaran"
          role="status"
          className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-white shadow-lg active:bg-red-700"
        >
          <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm font-bold">
            {pendingCount} pembayaran perlu dicek
          </span>
          <span className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold">
            Cek sekarang
          </span>
        </Link>
      )}
    </div>
  );
}
