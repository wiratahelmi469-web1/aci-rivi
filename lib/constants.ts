import type { Topping } from './types';

// Pengaturan jam buka warung (zona waktu WIB / Asia/Jakarta)
export const JAM_BUKA = 10; // 10:00 WIB
export const JAM_TUTUP = 21; // 21:00 WIB
export const INTERVAL_MENIT = 15; // Pilihan waktu ambil per 15 menit
export const MINIMAL_JEDA_MENIT = 20; // Minimal 20 menit dari waktu pemesanan
export const BATAS_BAYAR_MENIT = 10; // Batas waktu pembayaran QRIS (menit)

// PIN masuk pegawai (dapat diubah dengan mudah di sini)
export const PIN_PEGAWAI = '1234';

// Batas stok menipis untuk label "Sisa X"
export const BATAS_STOK_MENIPIS = 5;

// Daftar topping awal (stok masing-masing 20)
export const INITIAL_TOPPINGS: Topping[] = [
  { id: 'bakso', nama: 'Bakso', emoji: '🍡', harga: 2000, stok: 20, tersedia: true },
  { id: 'sosis', nama: 'Sosis', emoji: '🌭', harga: 2000, stok: 20, tersedia: true },
  { id: 'ceker', nama: 'Ceker', emoji: '🍗', harga: 3000, stok: 20, tersedia: true },
  { id: 'mie', nama: 'Mie', emoji: '🍜', harga: 2000, stok: 20, tersedia: true },
  { id: 'makaroni', nama: 'Makaroni', emoji: '🍝', harga: 2000, stok: 20, tersedia: true },
  { id: 'kerupuk', nama: 'Kerupuk', emoji: '🍘', harga: 1000, stok: 20, tersedia: true },
  { id: 'siomay', nama: 'Siomay', emoji: '🥟', harga: 3000, stok: 20, tersedia: true },
  { id: 'telur', nama: 'Telur', emoji: '🥚', harga: 3000, stok: 20, tersedia: true },
];
