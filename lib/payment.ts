import {
  confirmPayment,
  markOrderExpired,
  rejectPayment,
  submitProof,
  type HasilAksiPembayaran,
} from './ordersStore';

export type { HasilAksiPembayaran };

/**
 * Pembayaran QRIS toko dengan konfirmasi manual pegawai. Semua aturan (batas waktu,
 * stok, siapa boleh konfirmasi) dijalankan server di /api/orders/[id].
 *
 * Saat pindah ke payment gateway (Midtrans / Xendit), ganti alur di route itu dengan
 * QRIS dinamis + verifikasi webhook sebelum status berubah menjadi Lunas.
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
  return submitProof(orderId, buktiBayarDataUrl);
}

export function konfirmasiPembayaranPegawai(orderId: string): Promise<HasilAksiPembayaran> {
  return confirmPayment(orderId);
}

export async function tolakPembayaranPegawai(
  orderId: string,
  alasan: string
): Promise<HasilAksiPembayaran> {
  const clean = alasan.trim();
  if (!clean) {
    return {
      sukses: false,
      alasan: 'input_tidak_valid',
      pesan: 'Alasan penolakan wajib diisi.',
    };
  }
  return rejectPayment(orderId, clean);
}

export function batalkanPesananPelanggan(orderId: string): void {
  markOrderExpired(orderId);
}