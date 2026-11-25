import { DATA_CHANGED_EVENT, refreshToppings } from './toppingsStore';
import type { Order, OrderTopping, StatusPesanan, StoreSettings } from './types';

export type HasilAksiPembayaran =
  | { sukses: true; order: Order }
  | {
      sukses: false;
      alasan: 'tidak_ditemukan' | 'kedaluwarsa' | 'stok_habis' | 'input_tidak_valid';
      pesan: string;
      toppingHabis?: string[];
    };

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string };

export type WriteResult = { ok: true } | { ok: false; error: string };

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};
const POLL_MS = 5000;

let orderCache: Order[] = [];
let ready = false;
let settingsCache: StoreSettings = {};
let writes = 0;
let ordersInflight: Promise<void> | null = null;
let settingsInflight: Promise<void> | null = null;

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}

export function getAllOrders(): Order[] {
  return orderCache;
}
export function isOrdersReady(): boolean {
  return ready;
}
export function getStoreSettings(): StoreSettings {
  return settingsCache;
}

export function refreshOrders(): Promise<void> {
  if (writes > 0) return Promise.resolve(); // jangan menimpa perubahan yang sedang disimpan
  if (ordersInflight) return ordersInflight;

  ordersInflight = (async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (res.status === 401) {
        orderCache = [];
        ready = true;
        emit();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as Order[];
      if (writes === 0) {
        orderCache = data;
        ready = true;
        emit();
      }
    } catch {
      // jaringan putus: pakai data terakhir, coba lagi di putaran berikutnya
    } finally {
      ordersInflight = null;
    }
  })();
  return ordersInflight;
}

export function refreshSettings(): Promise<void> {
  if (settingsInflight) return settingsInflight;
  settingsInflight = (async () => {
    try {
      const res = await fetch('/api/settings/qris', { cache: 'no-store' });
      if (!res.ok) return;
      settingsCache = (await res.json()) as StoreSettings;
      emit();
    } catch {
      // abaikan
    } finally {
      settingsInflight = null;
    }
  })();
  return settingsInflight;
}

type CallResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; code?: string; toppingHabis?: string[] };

async function call(url: string, method: string, body?: unknown): Promise<CallResult> {
  writes++;
  try {
    const res = await fetch(url, {
      method,
      headers: HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, data };
    return {
      ok: false,
      error:
        typeof data.error === 'string'
          ? data.error
          : res.status === 401
            ? 'Sesi berakhir. Masuk ulang.'
            : 'Terjadi kesalahan. Coba lagi.',
      code: typeof data.code === 'string' ? data.code : undefined,
      toppingHabis: Array.isArray(data.toppingHabis) ? (data.toppingHabis as string[]) : undefined,
    };
  } catch {
    return { ok: false, error: 'Tidak dapat terhubung ke server. Coba lagi.' };
  } finally {
    writes--;
    void refreshOrders();
  }
}

function patchLocal(id: string, patch: Partial<Order>) {
  orderCache = orderCache.map((o) => (o.id === id ? { ...o, ...patch } : o));
  emit();
}

const orderUrl = (id: string) => `/api/orders/${encodeURIComponent(id)}`;

// ---- Membuat pesanan ----
export async function createOnlineOrder(input: {
  nama: string;
  nomorWhatsApp: string;
  catatan: string;
  waktuAmbil: string;
  toppingIds: string[];
}): Promise<CreateOrderResult> {
  const r = await call('/api/orders', 'POST', { sumber: 'Online', ...input });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, order: r.data.order as Order };
}

export async function createPrasmananOrder(input: {
  nama: string;
  daftarTopping: OrderTopping[];
  catatan: string;
}): Promise<CreateOrderResult> {
  const r = await call('/api/orders', 'POST', {
    sumber: 'Prasmanan',
    nama: input.nama,
    catatan: input.catatan,
    toppingIds: input.daftarTopping.map((t) => t.id),
  });
  void refreshToppings().catch(() => {}); // stok berubah di server
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, order: r.data.order as Order };
}

// ---- Pembayaran ----
async function payAction(id: string, body: unknown): Promise<HasilAksiPembayaran> {
  const r = await call(orderUrl(id), 'PATCH', body);
  if (r.ok) return { sukses: true, order: r.data.order as Order };
  return {
    sukses: false,
    alasan: (r.code as Extract<HasilAksiPembayaran, { sukses: false }>['alasan']) ?? 'input_tidak_valid',
    pesan: r.error,
    toppingHabis: r.toppingHabis,
  };
}

export const submitProof = (id: string, bukti: string) => payAction(id, { aksi: 'bukti', bukti });
export const rejectPayment = (id: string, alasan: string) => payAction(id, { aksi: 'tolak', alasan });

export async function confirmPayment(id: string): Promise<HasilAksiPembayaran> {
  const res = await payAction(id, { aksi: 'konfirmasi' });
  void refreshToppings().catch(() => {}); // stok berkurang di server
  return res;
}

// ---- Perubahan cepat (langsung terlihat, disimpan setelahnya) ----
export function markOrderExpired(orderId: string): void {
  const o = orderCache.find((x) => x.id === orderId);
  if (o && (o.statusBayar === 'Menunggu Pembayaran' || o.statusBayar === 'Ditolak')) {
    patchLocal(orderId, { statusBayar: 'Kedaluwarsa' });
  }
  void call(orderUrl(orderId), 'PATCH', { aksi: 'batal' });
}

export function advanceOrderStatus(orderId: string, nextStatus: StatusPesanan): void {
  patchLocal(orderId, { statusPesanan: nextStatus });
  void call(orderUrl(orderId), 'PATCH', { aksi: 'status', status: nextStatus });
}

// ---- QRIS toko ----
export async function saveQrisImage(qrisImage: string): Promise<WriteResult> {
  const r = await call('/api/settings/qris', 'PUT', { qrisImage });
  await refreshSettings();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

// ---- Sinkronisasi berkala ----
let syncUsers = 0;
let pollTimer: number | null = null;
let removeListeners: (() => void) | null = null;

export function startOrdersSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  syncUsers++;
  if (syncUsers === 1) {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        void refreshOrders();
        void refreshSettings();
      }
    };
    tick();
    pollTimer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    removeListeners = () => {
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }

  return () => {
    syncUsers--;
    if (syncUsers === 0) {
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollTimer = null;
      removeListeners?.();
      removeListeners = null;
    }
  };
}