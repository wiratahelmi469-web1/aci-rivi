import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders, toppings } from '@/lib/db/schema';
import { badCsrf, expireOverdue, fail, getActor, loadOrder, toOrder } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';

const bodySchema = z.discriminatedUnion('aksi', [
  z.object({
    aksi: z.literal('bukti'),
    bukti: z.string().max(900_000).regex(/^data:image\/(jpeg|png|webp);base64,/),
  }),
  z.object({ aksi: z.literal('batal') }),
  z.object({ aksi: z.literal('konfirmasi') }),
  z.object({ aksi: z.literal('tolak'), alasan: z.string().trim().min(1).max(200) }),
  z.object({
    aksi: z.literal('status'),
    status: z.enum(['Baru', 'Sedang Dibuat', 'Siap Diambil', 'Selesai']),
  }),
]);

const BELUM_LUNAS = ['Menunggu Pembayaran', 'Ditolak'];
const STAFF_DITOLAK = () =>
  fail(401, 'Akses pegawai diperlukan. Masuk ulang.', 'input_tidak_valid');

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = badCsrf(req);
  if (csrf) return csrf;

  const { id } = await params;
  const { staff, uid } = await getActor(req);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Permintaan tidak valid.', 'input_tidak_valid');
  const b = parsed.data;

  try {
    await expireOverdue();
    const row = await loadOrder(id);
    if (!row) return fail(404, 'Pesanan tidak ditemukan.', 'tidak_ditemukan');

    const isOwner = Boolean(uid) && row.uid === uid;
    const done = async () =>
      NextResponse.json({ order: toOrder((await loadOrder(id))!) });

    switch (b.aksi) {
      case 'bukti': {
        if (!isOwner) return fail(403, 'Pesanan ini bukan milik akunmu.', 'tidak_ditemukan');
        if (row.statusBayar === 'Lunas') return done();
        if (row.statusBayar === 'Kedaluwarsa') {
          return fail(409, 'Waktu pembayaran sudah habis. Silakan buat pesanan baru.', 'kedaluwarsa');
        }
        await db
          .update(orders)
          .set({
            statusBayar: 'Menunggu Konfirmasi',
            buktiBayar: b.bukti,
            buktiVersion: Date.now(),
            waktuUnggahBukti: new Date(),
            alasanPenolakan: null,
          })
          .where(and(eq(orders.id, id), inArray(orders.statusBayar, [...BELUM_LUNAS, 'Menunggu Konfirmasi'])));
        return done();
      }

      case 'batal': {
        if (!isOwner && !staff) return fail(403, 'Pesanan ini bukan milik akunmu.', 'tidak_ditemukan');
        if (BELUM_LUNAS.includes(row.statusBayar)) {
          await db
            .update(orders)
            .set({ statusBayar: 'Kedaluwarsa' })
            .where(and(eq(orders.id, id), inArray(orders.statusBayar, BELUM_LUNAS)));
        }
        return done();
      }

      case 'konfirmasi': {
        if (!staff) return STAFF_DITOLAK();
        if (row.statusBayar === 'Lunas') return done();
        if (row.statusBayar === 'Kedaluwarsa') {
          return fail(409, 'Pesanan ini sudah kedaluwarsa.', 'kedaluwarsa');
        }
        if (row.statusBayar !== 'Menunggu Konfirmasi') {
          return fail(409, 'Pelanggan belum mengirim bukti bayar.', 'input_tidak_valid');
        }

        const ids = row.daftarTopping.map((t) => t.id);
        const stokRows = await db
          .select({ id: toppings.id, stok: toppings.stok, tersedia: toppings.tersedia })
          .from(toppings)
          .where(inArray(toppings.id, ids));
        const byId = new Map(stokRows.map((r) => [r.id, r]));
        const habis = row.daftarTopping
          .filter((t) => {
            const s = byId.get(t.id);
            return !s || !s.tersedia || s.stok < 1;
          })
          .map((t) => t.nama);
        if (habis.length > 0) {
          return fail(
            409,
            `Stok topping ${habis.join(', ')} sudah tidak mencukupi. Tolak pembayaran agar pelanggan dapat menyesuaikan pesanan.`,
            'stok_habis',
            { toppingHabis: habis }
          );
        }

        // "Klaim" dulu supaya dua ketukan beruntun tidak mengurangi stok dua kali
        const claimed = await db
          .update(orders)
          .set({ statusBayar: 'Lunas', statusPesanan: 'Baru', alasanPenolakan: null })
          .where(and(eq(orders.id, id), eq(orders.statusBayar, 'Menunggu Konfirmasi')))
          .returning({ id: orders.id });
        if (claimed.length === 0) return done();

        const now = new Date();
        const decs = ids.map((tid) =>
          db
            .update(toppings)
            .set({ stok: sql`greatest(${toppings.stok} - 1, 0)`, updatedAt: now })
            .where(eq(toppings.id, tid))
        );
        await db.batch(decs as unknown as [(typeof decs)[0]]);
        return done();
      }

      case 'tolak': {
        if (!staff) return STAFF_DITOLAK();
        if (row.statusBayar === 'Lunas') {
          return fail(409, 'Pembayaran ini sudah dikonfirmasi.', 'input_tidak_valid');
        }
        await db
          .update(orders)
          .set({ statusBayar: 'Ditolak', alasanPenolakan: b.alasan })
          .where(and(eq(orders.id, id), inArray(orders.statusBayar, ['Menunggu Konfirmasi', 'Ditolak'])));
        return done();
      }

      case 'status': {
        if (!staff) return STAFF_DITOLAK();
        if (row.statusBayar !== 'Lunas') {
          return fail(409, 'Pesanan belum dibayar.', 'input_tidak_valid');
        }
        await db.update(orders).set({ statusPesanan: b.status }).where(eq(orders.id, id));
        return done();
      }
    }
  } catch (err) {
    console.error('orders PATCH error:', err instanceof Error ? err.message : err);
    return fail(500, 'Gagal menyimpan perubahan. Coba lagi.', 'input_tidak_valid');
  }
}