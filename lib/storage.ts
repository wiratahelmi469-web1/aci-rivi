import { BATAS_BAYAR_MENIT, INITIAL_TOPPINGS } from './constants';
import { getWibParts } from './time';
import type {
  Order,
  OrderTopping,
  StatusPesanan,
  StoreSettings,
  Topping,
} from './types';

const TOPPINGS_KEY = 'aci_rivi_toppings_v1';
const ORDERS_KEY = 'aci_rivi_orders_v1';
const SETTINGS_KEY = 'aci_rivi_settings_v1';
const SYNC_EVENT = 'aci-rivi-data-changed';
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
    if (
      e.key === TOPPINGS_KEY ||
      e.key === ORDERS_KEY ||
      e.key === SETTINGS_KEY
    ) {
      callback();
    }
  };
  const ch = getChannel();
  const handleChannel = () => callback();

  window.addEventListener(SYNC_EVENT, handleLocal);
  window.addEventListener('storage', handleStorage);
  ch?.addEventListener('message', handleChannel);

  return () => {
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

export function seedInitialToppingsIfNeeded(): Topping[] {
  if (typeof window === 'undefined') return INITIAL_TOPPINGS;
  const existing = window.localStorage.getItem(TOPPINGS_KEY);
  if (existing === null) {
    window.localStorage.setItem(TOPPINGS_KEY, JSON.stringify(INITIAL_TOPPINGS));
    return INITIAL_TOPPINGS;
  }
  return readJson<Topping[]>(TOPPINGS_KEY, INITIAL_TOPPINGS);
}

export function getToppings(): Topping[] {
  return seedInitialToppingsIfNeeded();
}

export function saveToppings(toppings: Topping[]): void {
  writeJson(TOPPINGS_KEY, toppings);
}

export function addTopping(input: {
  nama: string;
  emoji: string;
  foto?: string;
  harga: number;
  stok: number;
}): Topping {
  const current = getToppings();
  const cleanId =
    input.nama
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Date.now().toString(36).slice(-4);

  const newItem: Topping = {
    id: cleanId || `topping-${Date.now()}`,
    nama: input.nama.trim(),
    emoji: input.emoji.trim() || '🍲',
    foto: input.foto || undefined,
    harga: Math.max(0, Math.round(input.harga)),
    stok: Math.max(0, Math.round(input.stok)),
    tersedia: true,
  };
  saveToppings([...current, newItem]);
  return newItem;
}

export function updateTopping(
  id: string,
  patch: Partial<Omit<Topping, 'id'>>
): void {
  const current = getToppings();
  const updated = current.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      ...patch,
      stok:
        patch.stok !== undefined
          ? Math.max(0, Math.round(patch.stok))
          : item.stok,
      harga:
        patch.harga !== undefined
          ? Math.max(0, Math.round(patch.harga))
          : item.harga,
    };
  });
  saveToppings(updated);
}

export function deleteTopping(id: string): void {
  const current = getToppings();
  saveToppings(current.filter((item) => item.id !== id));
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

  const selectedIds = new Set(input.daftarTopping.map((t) => t.id));
  const updatedToppings = toppings.map((t) =>
    selectedIds.has(t.id) ? { ...t, stok: Math.max(0, t.stok - 1) } : t
  );
  saveToppings(updatedToppings);

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
