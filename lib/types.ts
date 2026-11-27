export type SumberPesanan = 'Online' | 'Prasmanan';

export type StatusBayar =
  | 'Menunggu Pembayaran'
  | 'Menunggu Konfirmasi'
  | 'Ditolak'
  | 'Lunas'
  | 'Kedaluwarsa';

export type StatusPesanan =
  | 'Baru'
  | 'Sedang Dibuat'
  | 'Siap Diambil'
  | 'Selesai';

export interface Topping {
  id: string;
  nama: string;
  emoji: string;
  foto?: string; // Data URL JPEG terkompresi (opsional; fallback ke emoji)
  harga: number;
  stok: number;
  tersedia: boolean;
}

export interface OrderTopping {
  id: string;
  nama: string;
  emoji?: string;
  harga: number;
  quantity: number;
}

export interface Order {
  id: string;
  uid?: string; // UID pelanggan pembuat pesanan (untuk pesanan Online)
  nomorPesanan: string;
  nama: string;
  nomorWhatsApp: string;
  sumber: SumberPesanan;
  daftarTopping: OrderTopping[];
  totalHarga: number;
  catatan: string;
  waktuAmbil: string; // Format "HH:mm" atau "Langsung"
  statusBayar: StatusBayar;
  statusPesanan: StatusPesanan;
  waktuDibuat: string; // ISO string
  batasBayar?: string; // ISO string (15 menit setelah dibuat untuk QRIS)
  buktiBayar?: string; // Data URL foto bukti bayar pelanggan
  waktuUnggahBukti?: string; // ISO string saat pelanggan mengirim bukti bayar
  alasanPenolakan?: string; // Alasan jika pegawai menolak bukti bayar
}

export type ChatSenderType = 'customer' | 'staff';

export interface ChatMessage {
  id: string;
  senderType: ChatSenderType;
  body: string;
  createdAt: string;
}

export interface StoreSettings {
  qrisImage?: string; // Data URL gambar QRIS toko
  qrisUpdatedAt?: string;
}
