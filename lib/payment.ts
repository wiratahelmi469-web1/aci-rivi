import {
  getAllOrders,
  getToppings,
  markOrderExpired,
  saveOrders,
  saveToppings,
} from './storage';
import type { Order } from './types';

export type HasilAksiPembayaran =
  | {
      sukses: true;
      order: Order;
    }
  | {
      sukses: false;
      alasan:
        | 'tidak_ditemukan'
        | 'kedaluwarsa'
        | 'stok_habis'
        | 'input_tidak_valid';
      pesan: string;
      toppingHabis?: string[];
    };

/**
 * Modul pembayaran terpisah untuk QRIS toko (konfirmasi manual pegawai).
 *
 * Saat integrasi ke payment gateway QRIS otomatis (Midtrans / Xendit):
 * cukup ganti alur ajukanBuktiPembayaran & konfirmasiPembayaranPegawai ini
 * dengan pembuatan QRIS dinamis + verifikasi webhook/status dari gateway
 * sebelum menjalankan pemotongan stok dan memindahkan status ke "Lunas".
 */

export async function ajukanBuktiPembayaran(
  orderId: string,
  buktiBayarDataUrl: string
): Promise<HasilAksiPembayaran> {
  if (!buktiBayarDataUrl || !buktiBayarDataUrl.startsWith('data:image/')) {
    return {
      sukses: false,
      alasan: 'input_tidak_valid',
      pesan: 'Unggah foto bukti bayar yang valid terlebih dahulu.',
    };
  }

  const orders = getAllOrders();
  const targetOrder = orders.find((o) => o.id === orderId);

  if (!targetOrder) {
    return {
      sukses: false,
      alasan: 'tidak_ditemukan',
      pesan: 'Pesanan tidak ditemukan.',
    };
  }

  if (targetOrder.statusBayar === 'Lunas') {
    return { sukses: true, order: targetOrder };
  }

  if (
    targetOrder.statusBayar === 'Kedaluwarsa' ||
    (targetOrder.statusBayar === 'Menunggu Pembayaran' &&
      targetOrder.batasBayar &&
      Date.now() > Date.parse(targetOrder.batasBayar))
  ) {
    markOrderExpired(orderId);
    return {
      sukses: false,
      alasan: 'kedaluwarsa',
      pesan: 'Waktu pembayaran sudah habis. Silakan buat pesanan baru.',
    };
  }

  const updatedOrder: Order = {
    ...targetOrder,
    statusBayar: 'Menunggu Konfirmasi',
    buktiBayar: buktiBayarDataUrl,
    waktuUnggahBukti: new Date().toISOString(),
    alasanPenolakan: undefined,
  };

  saveOrders(orders.map((o) => (o.id === orderId ? updatedOrder : o)));
  return { sukses: true, order: updatedOrder };
}

export async function konfirmasiPembayaranPegawai(
  orderId: string
): Promise<HasilAksiPembayaran> {
  const orders = getAllOrders();
  const targetOrder = orders.find((o) => o.id === orderId);

  if (!targetOrder) {
    return {
      sukses: false,
      alasan: 'tidak_ditemukan',
      pesan: 'Pesanan tidak ditemukan.',
    };
  }

  if (targetOrder.statusBayar === 'Lunas') {
    return { sukses: true, order: targetOrder };
  }

  if (targetOrder.statusBayar === 'Kedaluwarsa') {
    return {
      sukses: false,
      alasan: 'kedaluwarsa',
      pesan: 'Pesanan ini sudah kedaluwarsa.',
    };
  }

  // Cek stok ulang sebelum resmi masuk ke Pesanan Masuk
  const currentToppings = getToppings();
  const toppingHabis: string[] = [];

  for (const item of targetOrder.daftarTopping) {
    const found = currentToppings.find((t) => t.id === item.id);
    if (!found || !found.tersedia || found.stok < 1) {
      toppingHabis.push(item.nama);
    }
  }

  if (toppingHabis.length > 0) {
    return {
      sukses: false,
      alasan: 'stok_habis',
      toppingHabis,
      pesan: `Stok topping ${toppingHabis.join(', ')} sudah tidak mencukupi. Tolak pembayaran agar pelanggan dapat menyesuaikan pesanan.`,
    };
  }

  // Kurangi stok setiap topping dan set status Lunas + Baru
  const selectedIds = new Set(targetOrder.daftarTopping.map((t) => t.id));
  const updatedToppings = currentToppings.map((t) =>
    selectedIds.has(t.id) ? { ...t, stok: Math.max(0, t.stok - 1) } : t
  );
  saveToppings(updatedToppings);

  const paidOrder: Order = {
    ...targetOrder,
    statusBayar: 'Lunas',
    statusPesanan: 'Baru',
    alasanPenolakan: undefined,
  };

  saveOrders(orders.map((o) => (o.id === orderId ? paidOrder : o)));
  return { sukses: true, order: paidOrder };
}

export async function tolakPembayaranPegawai(
  orderId: string,
  alasan: string
): Promise<HasilAksiPembayaran> {
  const cleanReason = alasan.trim();
  if (!cleanReason) {
    return {
      sukses: false,
      alasan: 'input_tidak_valid',
      pesan: 'Alasan penolakan wajib diisi.',
    };
  }

  const orders = getAllOrders();
  const targetOrder = orders.find((o) => o.id === orderId);
  if (!targetOrder) {
    return {
      sukses: false,
      alasan: 'tidak_ditemukan',
      pesan: 'Pesanan tidak ditemukan.',
    };
  }

  const rejectedOrder: Order = {
    ...targetOrder,
    statusBayar: 'Ditolak',
    alasanPenolakan: cleanReason,
  };

  saveOrders(orders.map((o) => (o.id === orderId ? rejectedOrder : o)));
  return { sukses: true, order: rejectedOrder };
}

export function batalkanPesananPelanggan(orderId: string): void {
  markOrderExpired(orderId);
}
