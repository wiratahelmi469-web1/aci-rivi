import {
  INTERVAL_MENIT,
  JAM_BUKA,
  JAM_TUTUP,
  MINIMAL_JEDA_MENIT,
} from './constants';
import type { Order, PeriodeLaporan } from './types';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export const NAMA_BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export interface WibDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  dayOfWeek: number; // 0 (Minggu) - 6 (Sabtu)
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function getWibParts(input: Date | string | number = new Date()): WibDateParts {
  const date = input instanceof Date ? input : new Date(input);
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const second = shifted.getUTCSeconds();
  const dayOfWeek = shifted.getUTCDay();

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    dateKey: `${year}-${pad2(month)}-${pad2(day)}`,
    monthKey: `${year}-${pad2(month)}`,
  };
}

export function formatRupiah(nominal: number): string {
  const safe = Number.isFinite(nominal) ? Math.round(nominal) : 0;
  return `Rp${safe.toLocaleString('id-ID')}`;
}

export function formatTanggalWib(input: Date | string | number): string {
  const p = getWibParts(input);
  return `${p.day} ${NAMA_BULAN_ID[p.month - 1]} ${p.year}`;
}

export function formatTanggalJamWib(input: Date | string | number): string {
  const p = getWibParts(input);
  return `${p.day} ${NAMA_BULAN_ID[p.month - 1].slice(0, 3)} ${p.year}, ${pad2(p.hour)}.${pad2(p.minute)} WIB`;
}

export function formatJamMenitWib(input: Date | string | number): string {
  const p = getWibParts(input);
  return `${pad2(p.hour)}:${pad2(p.minute)} WIB`;
}

/**
 * Menghasilkan daftar pilihan jam pengambilan per 15 menit (10:00–21:00 WIB)
 * minimal 20 menit dari waktu sekarang. Slot yang lewat tidak ditampilkan.
 */
export function generatePickupSlots(now: Date = new Date()): string[] {
  const wibNow = getWibParts(now);
  const nowMinutes = wibNow.hour * 60 + wibNow.minute;
  const earliestAllowedMinutes = nowMinutes + MINIMAL_JEDA_MENIT;

  const openMinutes = JAM_BUKA * 60;
  const closeMinutes = JAM_TUTUP * 60;

  const slots: string[] = [];
  for (let m = openMinutes; m <= closeMinutes; m += INTERVAL_MENIT) {
    if (m >= earliestAllowedMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${pad2(h)}:${pad2(min)}`);
    }
  }
  return slots;
}

/**
 * Mengubah waktuAmbil menjadi nilai menit agar pesanan dapat diurutkan
 * berdasarkan waktu ambil terdekat.
 */
export function getPickupSortMinutes(order: Order): number {
  if (order.waktuAmbil && /^\d{2}:\d{2}$/.test(order.waktuAmbil)) {
    const [h, m] = order.waktuAmbil.split(':').map(Number);
    return h * 60 + m;
  }
  const created = getWibParts(order.waktuDibuat);
  return created.hour * 60 + created.minute;
}

export interface PeriodInfo {
  periode: PeriodeLaporan;
  label: string;
  fileName: string;
  startDateKey: string;
  endDateKey: string;
}

function fromUtcYmd(year: number, monthIndexZero: number, day: number) {
  const d = new Date(Date.UTC(year, monthIndexZero, day));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();
  return {
    year: y,
    month: m,
    day: dd,
    dateKey: `${y}-${pad2(m)}-${pad2(dd)}`,
    monthName: NAMA_BULAN_ID[m - 1],
  };
}

export function getPeriodInfoWib(
  periode: PeriodeLaporan,
  now: Date = new Date()
): PeriodInfo {
  const wib = getWibParts(now);

  if (periode === 'hari') {
    const label = `Hari Ini, ${wib.day} ${NAMA_BULAN_ID[wib.month - 1]} ${wib.year}`;
    return {
      periode,
      label,
      fileName: `Laporan-AciRivi-Hari-Ini-${wib.dateKey}.pdf`,
      startDateKey: wib.dateKey,
      endDateKey: wib.dateKey,
    };
  }

  if (periode === 'minggu') {
    const diffToMonday = wib.dayOfWeek === 0 ? 6 : wib.dayOfWeek - 1;
    const monday = fromUtcYmd(wib.year, wib.month - 1, wib.day - diffToMonday);
    const sunday = fromUtcYmd(
      wib.year,
      wib.month - 1,
      wib.day - diffToMonday + 6
    );

    let rangeText = '';
    if (monday.year === sunday.year && monday.month === sunday.month) {
      rangeText = `${monday.day}–${sunday.day} ${sunday.monthName} ${sunday.year}`;
    } else if (monday.year === sunday.year) {
      rangeText = `${monday.day} ${monday.monthName} – ${sunday.day} ${sunday.monthName} ${sunday.year}`;
    } else {
      rangeText = `${monday.day} ${monday.monthName} ${monday.year} – ${sunday.day} ${sunday.monthName} ${sunday.year}`;
    }

    return {
      periode,
      label: `Minggu Ini, ${rangeText}`,
      fileName: `Laporan-AciRivi-Minggu-Ini-${monday.dateKey}.pdf`,
      startDateKey: monday.dateKey,
      endDateKey: sunday.dateKey,
    };
  }

  // Bulan ini
  const lastDay = fromUtcYmd(wib.year, wib.month, 0);
  const firstDay = fromUtcYmd(wib.year, wib.month - 1, 1);
  return {
    periode,
    label: `Bulan Ini, ${NAMA_BULAN_ID[wib.month - 1]} ${wib.year}`,
    fileName: `Laporan-AciRivi-Bulan-Ini-${wib.monthKey}.pdf`,
    startDateKey: firstDay.dateKey,
    endDateKey: lastDay.dateKey,
  };
}

export function isOrderInPeriodWib(
  order: Order,
  periode: PeriodeLaporan,
  now: Date = new Date()
): boolean {
  const info = getPeriodInfoWib(periode, now);
  const orderDateKey = getWibParts(order.waktuDibuat).dateKey;
  return orderDateKey >= info.startDateKey && orderDateKey <= info.endDateKey;
}
