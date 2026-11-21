import {
  getAllOrders,
  getToppings,
  saveOrders,
  saveToppings,
} from './storage';
import type { Order } from './types';

export type HasilVerifikasiPembayaran =
  | {
      sukses: true;
      order: Order;
    }
  | {
      sukses: false;
      alasan: 'tidak_ditemukan' | 'kedaluwarsa' | 'stok_habis';
      pesan: string;
      toppingHabis?: string[];
    };

/**
 * Fungsi terpisah untuk verifikasi pembayaran QRIS.
 *
 * Saat integrasi ke payment gateway QRIS asli (Midtrans / Xendit):
 * cukup ganti bagian simulasi ini dengan panggilan API / pengecekan status
 * transaksi ke server payment gateway sebelum memproses pengurangan stok.
 */
export async function verifikasiPembayaran(
  orderId: string
): Promise<HasilVerifikasiPembayaran> {
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
    (targetOrder.batasBayar && Date.now() > Date.parse(targetOrder.batasBayar))
  ) {
    const expiredOrders = orders.map((o) =>
      o.id === orderId ? { ...o, statusBayar: 'Kedaluwarsa' as const } : o
    );
    saveOrders(expiredOrders);
    return {
      sukses: false,
      alasan: 'kedaluwarsa',
      pesan: 'Waktu pembayaran sudah habis. Silakan buat pesanan baru.',
    };
  }

  // Cek stok sekali lagi sebelum pesanan resmi masuk ke pegawai
  const currentToppings = getToppings();
  const toppingHabis: string[] = [];

  for (const item of targetOrder.daftarTopping) {
    const found = currentToppings.find((t) => t.id === item.id);
    if (!found || !found.tersedia || found.stok < 1) {
      toppingHabis.push(item.nama);
    }
  }

  if (toppingHabis.length > 0) {
    // Tandai pesanan tidak lanjut agar tidak masuk ke antrean pegawai
    const cancelledOrders = orders.map((o) =>
      o.id === orderId ? { ...o, statusBayar: 'Kedaluwarsa' as const } : o
    );
    saveOrders(cancelledOrders);

    return {
      sukses: false,
      alasan: 'stok_habis',
      toppingHabis,
      pesan: `Maaf, stok topping ${toppingHabis.join(', ')} sudah habis. Silakan pilih ulang topping.`,
    };
  }

  // Semua stok cukup: kurangi stok setiap topping dan ubah status menjadi Baru
  const selectedIds = new Set(targetOrder.daftarTopping.map((t) => t.id));
  const updatedToppings = currentToppings.map((t) =>
    selectedIds.has(t.id) ? { ...t, stok: Math.max(0, t.stok - 1) } : t
  );
  saveToppings(updatedToppings);

  const paidOrder: Order = {
    ...targetOrder,
    statusBayar: 'Lunas',
    statusPesanan: 'Baru',
  };

  const updatedOrders = orders.map((o) => (o.id === orderId ? paidOrder : o));
  saveOrders(updatedOrders);

  return {
    sukses: true,
    order: paidOrder,
  };
}
