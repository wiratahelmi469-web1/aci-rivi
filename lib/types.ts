export type SumberPesanan = 'Online' | 'Prasmanan';

export type StatusBayar = 'Menunggu' | 'Lunas' | 'Kedaluwarsa';

export type StatusPesanan =
  | 'Baru'
  | 'Sedang Dibuat'
  | 'Siap Diambil'
  | 'Selesai';

export interface Topping {
  id: string;
  nama: string;
  emoji: string;
  harga: number;
  stok: number;
  tersedia: boolean;
}

export interface OrderTopping {
  id: string;
  nama: string;
  emoji?: string;
  harga: number;
}

export interface Order {
  id: string;
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
  batasBayar?: string; // ISO string (10 menit setelah dibuat untuk QRIS)
}

export type PeriodeLaporan = 'hari' | 'minggu' | 'bulan';
