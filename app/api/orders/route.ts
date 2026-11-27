import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders, toppings } from '@/lib/db/schema';
import { BATAS_BAYAR_MENIT, BATAS_JUMLAH_TOPPING } from '@/lib/constants';
import {
  badCsrf,
  expireOverdue,
  fail,
  getActor,
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
    const fromParam = req.nextUrl.searchParams.get('from');
    const toParam = req.nextUrl.searchParams.get('to');
    let rangeStart: Date | undefined;
    let rangeEnd: Date | undefined;
    if (fromParam !== null || toParam !== null) {
      if (
        !fromParam ||
        !toParam ||
        !/(?:Z|[+-]\d{2}:\d{2})$/i.test(fromParam) ||
        !/(?:Z|[+-]\d{2}:\d{2})$/i.test(toParam)
      ) {
        return fail(400, 'Rentang tanggal harus memiliki waktu mulai dan akhir.', 'input_tidak_valid');
      }
      rangeStart = new Date(fromParam);
      rangeEnd = new Date(toParam);
      if (
        Number.isNaN(rangeStart.getTime()) ||
        Number.isNaN(rangeEnd.getTime()) ||
        rangeEnd < rangeStart
      ) {
        return fail(400, 'Rentang tanggal tidak valid.', 'input_tidak_valid');
      }
    }

    const conditions = staff
      ? rangeStart && rangeEnd
        ? and(
            gte(orders.waktuDibuat, rangeStart),
            lte(orders.waktuDibuat, rangeEnd),
            or(eq(orders.statusBayar, 'Lunas'), eq(orders.sumber, 'Prasmanan'))
          )
        : undefined
      : eq(orders.uid, uid!);
    const query = db
      .select(orderCols)
      .from(orders)
      .where(conditions)
      .orderBy(desc(orders.waktuDibuat));
    const rows =
      rangeStart && staff
        ? await query
        : await query.limit(staff ? 1000 : 100);

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
  toppingItems: z
    .array(
      z.object({
        id: z.string().max(100),
        quantity: z.number().int().min(1).max(BATAS_JUMLAH_TOPPING),
      })
    )
    .min(1)
    .max(40)
    .optional(),
  toppingIds: z.array(z.string().max(100)).min(1).max(40).optional(),
}).refine(
  (data) => Boolean(data.toppingItems?.length || data.toppingIds?.length),
  { message: 'Pilih minimal satu topping.' }
);

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

  const requestedItems =
    d.toppingItems ??
    [...new Set(d.toppingIds ?? [])].map((id) => ({ id, quantity: 1 }));
  if (new Set(requestedItems.map((item) => item.id)).size !== requestedItems.length) {
    return fail(400, 'Topping yang sama tidak boleh dikirim lebih dari sekali.', 'input_tidak_valid');
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
  const ids = requestedItems.map((item) => item.id);
  const quantities = new Map(requestedItems.map((item) => [item.id, item.quantity]));
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
      return !t || !t.tersedia || t.stok < quantities.get(id)!;
    })
    .map((id) => byId.get(id)?.nama ?? 'topping yang sudah dihapus');
  if (habis.length > 0) {
    return fail(409, `Stok topping berikut sudah habis: ${habis.join(', ')}.`, 'stok_habis', {
      toppingHabis: habis,
    });
  }

  const items: OrderTopping[] = ids.map((id) => {
    const t = byId.get(id)!;
    return {
      id: t.id,
      nama: t.nama,
      emoji: t.emoji,
      harga: t.harga,
      quantity: quantities.get(id)!,
    };
  });
  const totalHarga = items.reduce((sum, t) => sum + t.harga * t.quantity, 0);
  const tanggal = getWibParts(now).dateKey;

  const id = newOrderId();
  const values: typeof orders.$inferInsert = {
    id,
    uid: prasmanan ? null : uid,
    tanggal,
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
  };

  try {
    if (prasmanan) {
      const insert = db.insert(orders).values(values);
      const decs = items.map((item) =>
        db
          .update(toppings)
          .set({
            stok: sql`${toppings.stok} - ${item.quantity}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(toppings.id, item.id),
              eq(toppings.tersedia, true),
              gte(toppings.stok, item.quantity)
            )
          )
      );
      await db.batch([insert, ...decs] as unknown as [typeof insert]);
    } else {
      await db.insert(orders).values(values);
    }
    const row = await loadOrder(id);
    return NextResponse.json({ order: toOrder(row!) }, { status: 201 });
  } catch (err) {
    console.error('orders POST error:', err instanceof Error ? err.message : err);
    return fail(500, 'Gagal menyimpan pesanan. Coba lagi.', 'input_tidak_valid');
  }
}