import { BATAS_BAYAR_MENIT } from './constants';
import { getWibParts } from './time';
import {
  DATA_CHANGED_EVENT,
  getToppings,
  startToppingsSync,
  updateTopping,
} from './toppingsStore';
import type {
  Order,
  OrderTopping,
  StatusPesanan,
  StoreSettings,
} from './types';

export {
  addTopping,
  deleteTopping,
  getToppings,
  loadToppings,
  refreshToppings,
  updateTopping,
} from './toppingsStore';

const ORDERS_KEY = 'aci_rivi_orders_v1';
const SETTINGS_KEY = 'aci_rivi_settings_v1';
const SYNC_EVENT = DATA_CHANGED_EVENT;
const CHANNEL_NAME = 'aci-rivi-sync';

let broadcastChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return broadcastChannel;
}

export function notifyDataChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SYNC_EVENT));
  try {
    getChannel()?.postMessage({ type: 'sync', at: Date.now() });
  } catch {
    // Abaikan jika channel tidak tersedia
  }
}

export function subscribeDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleLocal = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === ORDERS_KEY || e.key === SETTINGS_KEY) {
      callback();
    }
  };
  const ch = getChannel();
  const handleChannel = () => callback();

  window.addEventListener(SYNC_EVENT, handleLocal);
  window.addEventListener('storage', handleStorage);
  ch?.addEventListener('message', handleChannel);

  // Topping dibaca dari server dan diperbarui berkala
  const stopToppingsSync = startToppingsSync();

  return () => {
    stopToppingsSync();
    window.removeEventListener(SYNC_EVENT, handleLocal);
    window.removeEventListener('storage', handleStorage);
    ch?.removeEventListener('message', handleChannel);
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notifyDataChanged();
  } catch {
    throw new Error(
      'Penyimpanan penuh. Gunakan gambar dengan ukuran lebih kecil.'
    );
  }
}

export function getStoreSettings(): StoreSettings {
  return readJson<StoreSettings>(SETTINGS_KEY, {});
}

export function saveQrisImage(qrisImage: string): void {
  const current = getStoreSettings();
  writeJson<StoreSettings>(SETTINGS_KEY, {
    ...current,
    qrisImage,
    qrisUpdatedAt: new Date().toISOString(),
  });
}

export function getAllOrders(): Order[] {
  const orders = readJson<Order[]>(ORDERS_KEY, []);
  const nowMs = Date.now();
  let changed = false;

  const synced = orders.map((order) => {
    // Hanya pesanan yang masih Menunggu Pembayaran (belum unggah bukti) yang kedaluwarsa otomatis
    if (
      order.statusBayar === 'Menunggu Pembayaran' &&
      order.batasBayar &&
      nowMs > Date.parse(order.batasBayar)
    ) {
      changed = true;
      return { ...order, statusBayar: 'Kedaluwarsa' as const };
    }
    return order;
  });

  if (changed && typeof window !== 'undefined') {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(synced));
  }

  return synced;
}

export function saveOrders(orders: Order[]): void {
  writeJson(ORDERS_KEY, orders);
}

/**
 * Sisi pegawai (Pesanan Masuk, Riwayat, Laporan) hanya membaca order
 * yang sudah Lunas atau sumber Prasmanan.
 */
export function getStaffOrders(): Order[] {
  return getAllOrders().filter(
    (order) => order.statusBayar === 'Lunas' || order.sumber === 'Prasmanan'
  );
}

/**
 * Daftar pesanan menunggu konfirmasi pembayaran pegawai (/pegawai/pembayaran).
 */
export function getPendingPaymentOrders(): Order[] {
  return getAllOrders()
    .filter((order) => order.statusBayar === 'Menunggu Konfirmasi')
    .sort((a, b) => Date.parse(a.waktuDibuat) - Date.parse(b.waktuDibuat));
}

function generateDailyOrderNumber(
  orders: Order[],
  now: Date = new Date()
): string {
  const todayWib = getWibParts(now).dateKey;
  const todaysCount = orders.filter(
    (o) => getWibParts(o.waktuDibuat).dateKey === todayWib
  ).length;
  const nextNumber = todaysCount + 1;
  return `#${String(nextNumber).padStart(3, '0')}`;
}

export function normalizeOrderNumberInput(raw: string): string {
  const cleaned = raw.trim().replace(/^#/, '');
  if (!cleaned) return '';
  if (/^\d+$/.test(cleaned)) {
    return `#${cleaned.padStart(3, '0')}`;
  }
  return `#${cleaned.toUpperCase()}`;
}

export function findOrderByQuery(query: string): Order | undefined {
  const orders = getAllOrders();
  const normalized = normalizeOrderNumberInput(query);
  if (!normalized) return undefined;

  const sortedDesc = [...orders].sort(
    (a, b) => Date.parse(b.waktuDibuat) - Date.parse(a.waktuDibuat)
  );
  return sortedDesc.find(
    (o) => o.nomorPesanan.toUpperCase() === normalized || o.id === query.trim()
  );
}

export function getCustomerOrders(uid: string): Order[] {
  if (!uid) return [];
  return getAllOrders()
    .filter((order) => order.uid === uid)
    .sort((a, b) => Date.parse(b.waktuDibuat) - Date.parse(a.waktuDibuat));
}

export function getOrderById(id: string): Order | undefined {
  return getAllOrders().find((o) => o.id === id);
}

export function createOnlineOrder(input: {
  uid: string;
  nama: string;
  nomorWhatsApp: string;
  daftarTopping: OrderTopping[];
  catatan: string;
  waktuAmbil: string;
}): Order {
  const orders = getAllOrders();
  const now = new Date();
  const totalHarga = input.daftarTopping.reduce((sum, t) => sum + t.harga, 0);
  const batasBayar = new Date(
    now.getTime() + BATAS_BAYAR_MENIT * 60 * 1000
  ).toISOString();

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    uid: input.uid,
    nomorPesanan: generateDailyOrderNumber(orders, now),
    nama: input.nama.trim(),
    nomorWhatsApp: input.nomorWhatsApp.trim(),
    sumber: 'Online',
    daftarTopping: input.daftarTopping,
    totalHarga,
    catatan: input.catatan.trim(),
    waktuAmbil: input.waktuAmbil,
    statusBayar: 'Menunggu Pembayaran',
    statusPesanan: 'Baru',
    waktuDibuat: now.toISOString(),
    batasBayar,
  };

  saveOrders([...orders, newOrder]);
  return newOrder;
}

export function markOrderExpired(orderId: string): void {
  const orders = getAllOrders();
  const updated = orders.map((order) =>
    order.id === orderId &&
    (order.statusBayar === 'Menunggu Pembayaran' ||
      order.statusBayar === 'Ditolak')
      ? { ...order, statusBayar: 'Kedaluwarsa' as const }
      : order
  );
  saveOrders(updated);
}

export function createPrasmananOrder(input: {
  nama: string;
  daftarTopping: OrderTopping[];
  catatan: string;
}): { ok: true; order: Order } | { ok: false; error: string } {
  const toppings = getToppings();
  const outOfStock: string[] = [];

  for (const selected of input.daftarTopping) {
    const current = toppings.find((t) => t.id === selected.id);
    if (!current || !current.tersedia || current.stok < 1) {
      outOfStock.push(selected.nama);
    }
  }

  if (outOfStock.length > 0) {
    return {
      ok: false,
      error: `Stok topping berikut sudah habis: ${outOfStock.join(', ')}.`,
    };
  }

  // Kurangi stok di server (perubahan langsung terlihat, disimpan setelahnya)
  for (const selected of input.daftarTopping) {
    const current = toppings.find((t) => t.id === selected.id);
    if (current) {
      void updateTopping(current.id, { stok: Math.max(0, current.stok - 1) });
    }
  }

  const orders = getAllOrders();
  const now = new Date();
  const totalHarga = input.daftarTopping.reduce((sum, t) => sum + t.harga, 0);

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nomorPesanan: generateDailyOrderNumber(orders, now),
    nama: input.nama.trim(),
    nomorWhatsApp: '',
    sumber: 'Prasmanan',
    daftarTopping: input.daftarTopping,
    totalHarga,
    catatan: input.catatan.trim(),
    waktuAmbil: 'Langsung',
    statusBayar: 'Lunas',
    statusPesanan: 'Baru',
    waktuDibuat: now.toISOString(),
  };

  saveOrders([...orders, newOrder]);
  return { ok: true, order: newOrder };
}

export function advanceOrderStatus(
  orderId: string,
  nextStatus: StatusPesanan
): void {
  const orders = getAllOrders();
  const updated = orders.map((order) =>
    order.id === orderId ? { ...order, statusPesanan: nextStatus } : order
  );
  saveOrders(updated);
}