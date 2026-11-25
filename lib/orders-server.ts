import { randomUUID } from 'node:crypto';
import { and, eq, getTableColumns, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { STAFF_COOKIE_NAME, verifyToken } from '@/lib/staff-session';
import type { Order } from '@/lib/types';

// Kolom daftar pesanan: tanpa isi foto bukti bayar (berat)
const { buktiBayar: _omit, ...orderCols } = getTableColumns(orders);
export { orderCols };
export type OrderRow = Omit<typeof orders.$inferSelect, 'buktiBayar'>;

export async function getActor(req: NextRequest) {
  const staff = verifyToken(req.cookies.get(STAFF_COOKIE_NAME)?.value);
  const session = await auth();
  return { staff, uid: session?.user?.id ?? null };
}

export function badCsrf(req: NextRequest): NextResponse | null {
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return fail(403, 'Permintaan tidak valid.', 'input_tidak_valid');
  }
  return null;
}

export function fail(
  status: number,
  error: string,
  code: string,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

export function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    uid: r.uid ?? undefined,
    nomorPesanan: `#${String(r.nomor).padStart(3, '0')}`,
    nama: r.nama,
    nomorWhatsApp: r.nomorWhatsApp,
    sumber: r.sumber as Order['sumber'],
    daftarTopping: r.daftarTopping,
    totalHarga: r.totalHarga,
    catatan: r.catatan,
    waktuAmbil: r.waktuAmbil,
    statusBayar: r.statusBayar as Order['statusBayar'],
    statusPesanan: r.statusPesanan as Order['statusPesanan'],
    waktuDibuat: r.waktuDibuat.toISOString(),
    batasBayar: r.batasBayar?.toISOString(),
    buktiBayar:
      r.buktiVersion > 0
        ? `/api/orders/${encodeURIComponent(r.id)}/bukti?v=${r.buktiVersion}`
        : undefined,
    waktuUnggahBukti: r.waktuUnggahBukti?.toISOString(),
    alasanPenolakan: r.alasanPenolakan ?? undefined,
  };
}

export async function loadOrder(id: string) {
  const [row] = await db.select(orderCols).from(orders).where(eq(orders.id, id));
  return row;
}

/** Pesanan yang belum dibayar dan melewati batas waktu otomatis kedaluwarsa. */
export async function expireOverdue() {
  await db
    .update(orders)
    .set({ statusBayar: 'Kedaluwarsa' })
    .where(
      and(
        eq(orders.statusBayar, 'Menunggu Pembayaran'),
        lt(orders.batasBayar, new Date())
      )
    );
}

export function newOrderId() {
  return `ord-${randomUUID().slice(0, 13)}`;
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

export function imageResponse(dataUrl: string | null | undefined, cache: string) {
  const m = dataUrl ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl) : null;
  if (!m) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(m[2], 'base64')), {
    headers: { 'Content-Type': m[1], 'Cache-Control': cache },
  });
}