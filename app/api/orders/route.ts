import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders, toppings } from '@/lib/db/schema';
import { BATAS_BAYAR_MENIT } from '@/lib/constants';
import {
  badCsrf,
  expireOverdue,
  fail,
  getActor,
  isUniqueViolation,
  loadOrder,
  newOrderId,
  orderCols,
  toOrder,
} from '@/lib/orders-server';
import { generatePickupSlots, getWibParts } from '@/lib/time';
import type { OrderTopping } from '@/lib/types';
import { getWhatsAppValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { staff, uid } = await getActor(req);
  if (!staff && !uid) {
    return fail(401, 'Masuk dulu untuk melihat pesanan.', 'input_tidak_valid');
  }

  try {
    await expireOverdue();
    const rows = await db
      .select(orderCols)
      .from(orders)
      .where(staff ? undefined : eq(orders.uid, uid!))
      .orderBy(desc(orders.waktuDibuat))
      .limit(staff ? 1000 : 100);

    return NextResponse.json(rows.map(toOrder), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('orders GET error:', err instanceof Error ? err.message : err);
    return fail(500, 'Gagal memuat pesanan.', 'input_tidak_valid');
  }
}

const createSchema = z.object({
  sumber: z.enum(['Online', 'Prasmanan']).default('Online'),
  nama: z.string().trim().min(1).max(80),
  nomorWhatsApp: z.string().trim().max(20).default(''),
  catatan: z.string().trim().max(200).default(''),
  waktuAmbil: z.string().max(10).optional(),
  toppingIds: z.array(z.string().max(100)).min(1).max(40),
});

export async function POST(req: NextRequest) {
  const csrf = badCsrf(req);
  if (csrf) return csrf;

  const { staff, uid } = await getActor(req);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, 'Data pesanan tidak valid.', 'input_tidak_valid');
  }
  const d = parsed.data;
  const prasmanan = d.sumber === 'Prasmanan';

  if (prasmanan && !staff) {
    return fail(401, 'Akses pegawai diperlukan. Masuk ulang.', 'input_tidak_valid');
  }
  if (!prasmanan && !uid) {
    return fail(401, 'Masuk dulu untuk memesan.', 'input_tidak_valid');
  }

  const now = new Date();
  if (!prasmanan) {
    const waError = getWhatsAppValidationError(d.nomorWhatsApp);
    if (waError) return fail(400, waError, 'input_tidak_valid');
    if (!d.waktuAmbil || !generatePickupSlots(now).includes(d.waktuAmbil)) {
      return fail(400, 'Waktu pengambilan tidak tersedia. Pilih jam lain.', 'input_tidak_valid');
    }
  }

  // Harga dan stok selalu dibaca dari database, bukan dari browser
  const ids = [...new Set(d.toppingIds)];
  const rows = await db
    .select({
      id: toppings.id,
      nama: toppings.nama,
      emoji: toppings.emoji,
      harga: toppings.harga,
      stok: toppings.stok,
      tersedia: toppings.tersedia,
    })
    .from(toppings)
    .where(inArray(toppings.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const habis = ids
    .filter((id) => {
      const t = byId.get(id);
      return !t || !t.tersedia || t.stok < 1;
    })
    .map((id) => byId.get(id)?.nama ?? 'topping yang sudah dihapus');
  if (habis.length > 0) {
    return fail(409, `Stok topping berikut sudah habis: ${habis.join(', ')}.`, 'stok_habis', {
      toppingHabis: habis,
    });
  }

  const items: OrderTopping[] = ids.map((id) => {
    const t = byId.get(id)!;
    return { id: t.id, nama: t.nama, emoji: t.emoji, harga: t.harga };
  });
  const totalHarga = items.reduce((sum, t) => sum + t.harga, 0);
  const tanggal = getWibParts(now).dateKey;

  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ maxNomor }] = await db
      .select({ maxNomor: sql<number | null>`max(${orders.nomor})` })
      .from(orders)
      .where(eq(orders.tanggal, tanggal));
    const nomor = Number(maxNomor ?? 0) + 1;
    const id = newOrderId();

    const insert = db.insert(orders).values({
      id,
      uid: prasmanan ? null : uid,
      tanggal,
      nomor,
      nama: d.nama,
      nomorWhatsApp: prasmanan ? '' : d.nomorWhatsApp,
      sumber: d.sumber,
      daftarTopping: items,
      totalHarga,
      catatan: d.catatan,
      waktuAmbil: prasmanan ? 'Langsung' : d.waktuAmbil!,
      statusBayar: prasmanan ? 'Lunas' : 'Menunggu Pembayaran',
      statusPesanan: 'Baru',
      batasBayar: prasmanan ? null : new Date(now.getTime() + BATAS_BAYAR_MENIT * 60_000),
    });

    try {
      if (prasmanan) {
        // Simpan pesanan dan kurangi stok sebagai satu kesatuan
        const decs = ids.map((tid) =>
          db
            .update(toppings)
            .set({ stok: sql`${toppings.stok} - 1`, updatedAt: now })
            .where(and(eq(toppings.id, tid), eq(toppings.tersedia, true), gte(toppings.stok, 1)))
        );
        await db.batch([insert, ...decs] as unknown as [typeof insert]);
      } else {
        await insert;
      }
      const row = await loadOrder(id);
      return NextResponse.json({ order: toOrder(row) }, { status: 201 });
    } catch (err) {
      if (isUniqueViolation(err)) continue; // nomor bentrok, coba nomor berikutnya
      console.error('orders POST error:', err instanceof Error ? err.message : err);
      return fail(500, 'Gagal menyimpan pesanan. Coba lagi.', 'input_tidak_valid');
    }
  }
  return fail(503, 'Sedang ramai. Coba lagi sebentar.', 'input_tidak_valid');
}