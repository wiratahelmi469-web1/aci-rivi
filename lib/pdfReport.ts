import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRupiah, formatTanggalJamWib, getPeriodInfoWib } from './time';
import type { Order, PeriodeLaporan } from './types';

export interface TopToppingSummary {
  nama: string;
  jumlah: number;
  totalNilai: number;
}

export function hitungStatistikLaporan(orders: Order[]) {
  const totalPesanan = orders.length;
  const totalPendapatan = orders.reduce((sum, o) => sum + o.totalHarga, 0);
  const jumlahOnline = orders.filter((o) => o.sumber === 'Online').length;
  const jumlahPrasmanan = orders.filter((o) => o.sumber === 'Prasmanan').length;

  const toppingMap = new Map<string, TopToppingSummary>();
  for (const order of orders) {
    for (const t of order.daftarTopping) {
      const prev = toppingMap.get(t.nama);
      if (prev) {
        prev.jumlah += 1;
        prev.totalNilai += t.harga;
      } else {
        toppingMap.set(t.nama, {
          nama: t.nama,
          jumlah: 1,
          totalNilai: t.harga,
        });
      }
    }
  }

  const toppingTerlaris = Array.from(toppingMap.values()).sort(
    (a, b) => b.jumlah - a.jumlah || b.totalNilai - a.totalNilai
  );

  return {
    totalPesanan,
    totalPendapatan,
    jumlahOnline,
    jumlahPrasmanan,
    toppingTerlaris,
  };
}

export function unduhLaporanPdf(orders: Order[], periode: PeriodeLaporan): void {
  if (orders.length === 0) return;

  const now = new Date();
  const periodInfo = getPeriodInfoWib(periode, now);
  const stats = hitungStatistikLaporan(orders);
  const sortedOrders = [...orders].sort(
    (a, b) => Date.parse(b.waktuDibuat) - Date.parse(a.waktuDibuat)
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const brandColor: [number, number, number] = [217, 56, 30]; // Merah-oranye hangat Aci Rivi
  const softHeaderBg: [number, number, number] = [255, 243, 238];
  const darkText: [number, number, number] = [28, 25, 23];
  const mutedText: [number, number, number] = [100, 95, 90];

  // Header garis aksen atas
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, 210, 4, 'F');

  // 1. Judul dan periode
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...brandColor);
  doc.text('Laporan Pembelian — Aci Rivi', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...darkText);
  doc.text(periodInfo.label, 14, 25);

  // 2. Tanggal & jam cetak
  doc.setFontSize(9.5);
  doc.setTextColor(...mutedText);
  doc.text(`Dicetak pada: ${formatTanggalJamWib(now)}`, 14, 31);

  // Garis pemisah tipis
  doc.setDrawColor(231, 229, 228);
  doc.line(14, 35, 196, 35);

  // 3. Ringkasan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...darkText);
  doc.text('Ringkasan Periode', 14, 43);

  autoTable(doc, {
    startY: 46,
    head: [['Total Pesanan', 'Total Pendapatan', 'Pesanan Online', 'Pesanan Prasmanan']],
    body: [
      [
        `${stats.totalPesanan} pesanan`,
        formatRupiah(stats.totalPendapatan),
        `${stats.jumlahOnline} pesanan`,
        `${stats.jumlahPrasmanan} pesanan`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: brandColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'left',
    },
    bodyStyles: {
      textColor: darkText,
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4,
    },
    margin: { left: 14, right: 14 },
  });

  const afterSummaryY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 68;

  // 4. Tabel topping terlaris
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...darkText);
  doc.text('Topping Terlaris', 14, afterSummaryY + 10);

  autoTable(doc, {
    startY: afterSummaryY + 13,
    head: [['No', 'Nama Topping', 'Jumlah Terjual', 'Total Nilai']],
    body: stats.toppingTerlaris.map((t, idx) => [
      String(idx + 1),
      t.nama,
      `${t.jumlah} porsi`,
      formatRupiah(t.totalNilai),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: softHeaderBg,
      textColor: brandColor,
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    bodyStyles: {
      textColor: darkText,
      fontSize: 9.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 42, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const afterToppingsY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? afterSummaryY + 40;

  // 5. Tabel seluruh pesanan + 6. Baris total di bagian bawah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...darkText);
  doc.text('Daftar Seluruh Pesanan', 14, afterToppingsY + 10);

  autoTable(doc, {
    startY: afterToppingsY + 13,
    head: [['Nomor', 'Tanggal & Jam', 'Nama', 'Sumber', 'Daftar Topping', 'Total']],
    body: sortedOrders.map((order) => [
      order.nomorPesanan,
      formatTanggalJamWib(order.waktuDibuat),
      order.nama,
      order.sumber,
      order.daftarTopping.map((t) => t.nama).join(', '),
      formatRupiah(order.totalHarga),
    ]),
    foot: [
      [
        'TOTAL',
        `${stats.totalPesanan} Pesanan`,
        '',
        '',
        '',
        formatRupiah(stats.totalPendapatan),
      ],
    ],
    theme: 'striped',
    showFoot: 'lastPage',
    headStyles: {
      fillColor: brandColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: darkText,
      fontSize: 8.5,
      cellPadding: 2.8,
      valign: 'top',
    },
    footStyles: {
      fillColor: softHeaderBg,
      textColor: brandColor,
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 36 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 50 },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  // Nomor halaman pada setiap halaman
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedText);
    doc.text(
      `Aci Rivi — Halaman ${i} dari ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(periodInfo.fileName);
}
