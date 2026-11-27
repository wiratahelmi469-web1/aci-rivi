import { DATA_CHANGED_EVENT, startToppingsSync } from './toppingsStore';
import { getAllOrders, startOrdersSync } from './ordersStore';
import type { Order } from './types';

export {
  addTopping,
  deleteTopping,
  getToppings,
  loadToppings,
  refreshToppings,
  updateTopping,
} from './toppingsStore';

export {
  advanceOrderStatus,
  createOnlineOrder,
  createPrasmananOrder,
  getAllOrders,
  getStoreSettings,
  isOrdersReady,
  markOrderExpired,
  saveQrisImage,
} from './ordersStore';

export function notifyDataChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

/** Memberi tahu komponen saat data berubah; data diambil dari server tiap beberapa detik. */
export function subscribeDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener(DATA_CHANGED_EVENT, handler);
  const stopToppings = startToppingsSync();
  const stopOrders = startOrdersSync();

  return () => {
    stopToppings();
    stopOrders();
    window.removeEventListener(DATA_CHANGED_EVENT, handler);
  };
}

/** Sisi pegawai hanya membaca order yang sudah Lunas atau sumber Prasmanan. */
export function getStaffOrders(): Order[] {
  return getAllOrders().filter(
    (order) => order.statusBayar === 'Lunas' || order.sumber === 'Prasmanan'
  );
}

/** Pesanan menunggu konfirmasi pembayaran pegawai (/pegawai/pembayaran). */
export function getPendingPaymentOrders(): Order[] {
  return getAllOrders()
    .filter((order) => order.statusBayar === 'Menunggu Konfirmasi')
    .sort((a, b) => Date.parse(a.waktuDibuat) - Date.parse(b.waktuDibuat));
}

export function normalizeOrderNumberInput(raw: string): string {
  const cleaned = raw.trim().replace(/^#/, '').toUpperCase();
  if (!cleaned) return '';
  const numeric = /^ACI-(\d+)$/.exec(cleaned)?.[1] ?? cleaned;
  if (/^\d+$/.test(numeric)) {
    return `ACI-${numeric.padStart(4, '0')}`;
  }
  return cleaned;
}

export function findOrderByQuery(query: string): Order | undefined {
  const normalized = normalizeOrderNumberInput(query);
  if (!normalized) return undefined;

  const sortedDesc = [...getAllOrders()].sort(
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