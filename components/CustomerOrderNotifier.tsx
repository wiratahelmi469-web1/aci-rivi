'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ChefHat, PackageCheck } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import {
  getCustomerOrders,
  isOrdersReady,
  subscribeDataChanges,
} from '@/lib/storage';
import type { Order } from '@/lib/types';

type Tone = 'success' | 'info' | 'ready' | 'danger';

interface Notice {
  orderId: string;
  key: string;
  nomor: string;
  tone: Tone;
  title: string;
  message: string;
  cta: string;
}

const mapKey = (uid: string) => `aci_rivi_notified_v1:${uid}`;

function readMap(uid: string): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(mapKey(uid)) ?? '{}');
  } catch {
    return {};
  }
}

function writeMap(uid: string, map: Record<string, string>) {
  try {
    window.localStorage.setItem(mapKey(uid), JSON.stringify(map));
  } catch {
    // abaikan
  }
}

function statusKey(order: Order): string {
  return order.statusBayar === 'Lunas'
    ? `L:${order.statusPesanan}`
    : `B:${order.statusBayar}`;
}

function buildNotice(order: Order, key: string, prev: string): Notice | null {
  const base = { orderId: order.id, key, nomor: order.nomorPesanan };
  switch (key) {
    case 'L:Baru':
      if (!prev.startsWith('B:')) return null;
      return {
        ...base,
        tone: 'success',
        title: 'Pembayaran diterima',
        message: 'Pesananmu sudah masuk ke dapur. Kami kabari lagi saat mulai dibuat.',
        cta: 'Lihat pesanan',
      };
    case 'L:Sedang Dibuat':
      return {
        ...base,
        tone: 'info',
        title: 'Pesananmu sedang dibuat',
        message: 'Seblakmu sedang dimasak. Sebentar lagi siap.',
        cta: 'Lihat pesanan',
      };
    case 'L:Siap Diambil':
      return {
        ...base,
        tone: 'ready',
        title: 'Pesananmu siap diambil',
        message: `Tunjukkan nomor ${order.nomorPesanan} ke kasir Aci Rivi.`,
        cta: 'Lihat nomor pesanan',
      };
    case 'B:Ditolak':
      return {
        ...base,
        tone: 'danger',
        title: 'Bukti bayar ditolak',
        message: `Alasan: ${order.alasanPenolakan || 'perlu dicek ulang'}. Unggah ulang bukti yang benar.`,
        cta: 'Unggah ulang',
      };
    default:
      return null;
  }
}

const TONE_STYLE: Record<Tone, { icon: string; button: string; Icon: typeof CheckCircle2 }> = {
  success: { icon: 'bg-emerald-100 text-emerald-700', button: 'bg-emerald-600 active:bg-emerald-700', Icon: CheckCircle2 },
  info: { icon: 'bg-orange-100 text-orange-700', button: 'bg-red-600 active:bg-red-700', Icon: ChefHat },
  ready: { icon: 'bg-red-600 text-white', button: 'bg-red-600 active:bg-red-700', Icon: PackageCheck },
  danger: { icon: 'bg-red-100 text-red-700', button: 'bg-red-600 active:bg-red-700', Icon: AlertCircle },
};

function NoticeDialog({
  notice,
  extra,
  onClose,
  onOpen,
}: {
  notice: Notice;
  extra: number;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [shown, setShown] = useState(false);
  const openRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    openRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    if (notice.tone === 'ready') {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // tidak didukung
      }
    }
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
  }, [notice.tone]);

  const style = TONE_STYLE[notice.tone];
  const Icon = style.Icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="presentation">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        aria-describedby="notice-desc"
        className={`relative w-full max-w-md rounded-t-[28px] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center shadow-xl transition-all duration-200 motion-reduce:transition-none sm:rounded-[28px] sm:pb-6 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${style.icon}`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <h2 id="notice-title" className="mt-4 text-xl font-bold text-stone-900">
          {notice.title}
        </h2>
        <p className="mt-1 font-mono text-4xl font-bold text-red-600 tabular-nums">
          {notice.nomor}
        </p>
        <p id="notice-desc" className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-stone-600">
          {notice.message}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={openRef}
            type="button"
            onClick={onOpen}
            className={`h-12 rounded-2xl px-6 text-base font-bold text-white transition-colors ${style.button}`}
          >
            {notice.cta}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl px-6 text-sm font-semibold text-stone-500 hover:text-stone-800"
          >
            Nanti saja
          </button>
        </div>

        {extra > 0 && (
          <p className="mt-3 text-xs text-stone-500">{extra} notifikasi lain menunggu</p>
        )}
      </div>
    </div>
  );
}

export function CustomerOrderNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authReady } = useCustomerAuth();
  const uid = user?.uid ?? null;

  const [queue, setQueue] = useState<Notice[]>([]);
  const pathRef = useRef(pathname);
  const queuedRef = useRef(new Map<string, string>());
  const checkRef = useRef<() => void>(() => {});

  useEffect(() => {
    pathRef.current = pathname;
    checkRef.current();
  }, [pathname]);

  useEffect(() => {
    if (!authReady || !uid) return;
    const queued = queuedRef.current;

    const check = () => {
      if (!isOrdersReady()) return;
      if (pathRef.current.startsWith('/pegawai')) return;

      const orders = getCustomerOrders(uid);
      const map = readMap(uid);
      let mapChanged = false;
      const incoming: Notice[] = [];
      const resolved: string[] = [];

      for (const order of orders) {
        const key = statusKey(order);
        const prev = map[order.id];
        if (prev === key) continue;

        // Pesanan yang baru pertama terlihat hanya dicatat sebagai acuan
        if (prev === undefined) {
          map[order.id] = key;
          mapChanged = true;
          continue;
        }

        const notice = buildNotice(order, key, prev);
        const viewing = pathRef.current === `/pesanan/${order.id}`;

        if (!notice || viewing) {
          map[order.id] = key;
          mapChanged = true;
          if (queued.delete(order.id)) resolved.push(order.id);
          continue;
        }

        if (queued.get(order.id) === key) continue;
        queued.set(order.id, key);
        incoming.push(notice);
      }

      if (orders.length > 0) {
        const ids = new Set(orders.map((o) => o.id));
        for (const id of Object.keys(map)) {
          if (!ids.has(id)) {
            delete map[id];
            mapChanged = true;
          }
        }
      }
      if (mapChanged) writeMap(uid, map);

      if (incoming.length > 0 || resolved.length > 0) {
        setQueue((q) => [
          ...q.filter(
            (n) =>
              !resolved.includes(n.orderId) &&
              !incoming.some((i) => i.orderId === n.orderId)
          ),
          ...incoming,
        ]);
      }
    };

    checkRef.current = check;
    const t = window.setTimeout(check, 0);
    const unsub = subscribeDataChanges(check);

    return () => {
      window.clearTimeout(t);
      unsub();
      checkRef.current = () => {};
      queued.clear();
      setQueue([]);
    };
  }, [authReady, uid]);

  const current = queue[0];
  if (!uid || !current || pathname.startsWith('/pegawai')) return null;

  const dismiss = (notice: Notice) => {
    const map = readMap(uid);
    map[notice.orderId] = notice.key;
    writeMap(uid, map);
    queuedRef.current.delete(notice.orderId);
    setQueue((q) => q.filter((n) => n.orderId !== notice.orderId));
  };

  return (
    <NoticeDialog
      key={`${current.orderId}:${current.key}`}
      notice={current}
      extra={queue.length - 1}
      onClose={() => dismiss(current)}
      onOpen={() => {
        dismiss(current);
        router.push(`/pesanan/${current.orderId}`);
      }}
    />
  );
}