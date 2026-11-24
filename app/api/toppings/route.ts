import { NextRequest, NextResponse } from 'next/server';
import { asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { toppings } from '@/lib/db/schema';
import { staffGuard } from '@/lib/staff-session';

export const dynamic = 'force-dynamic';

export const FOTO_REGEX = /^data:image\/(jpeg|png|webp);base64,/;

export async function GET() {
  try {
    const rows = await db
      .select({
        id: toppings.id,
        nama: toppings.nama,
        emoji: toppings.emoji,
        hasFoto: sql<boolean>`${toppings.foto} is not null`,
        fotoVersion: toppings.fotoVersion,
        harga: toppings.harga,
        stok: toppings.stok,
        tersedia: toppings.tersedia,
      })
      .from(toppings)
      .orderBy(asc(toppings.createdAt), asc(toppings.id));

    const data = rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      emoji: r.emoji,
      foto: r.hasFoto
        ? `/api/toppings/${encodeURIComponent(r.id)}/foto?v=${r.fotoVersion}`
        : undefined,
      harga: r.harga,
      stok: r.stok,
      tersedia: r.tersedia,
    }));

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('toppings GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal memuat topping.' }, { status: 500 });
  }
}

const createSchema = z.object({
  nama: z.string().trim().min(1).max(60),
  emoji: z.string().trim().max(16).optional(),
  foto: z.string().max(600_000).regex(FOTO_REGEX).optional(),
  harga: z.number().int().min(0).max(10_000_000),
  stok: z.number().int().min(0).max(100_000),
});

export async function POST(req: NextRequest) {
  const denied = staffGuard(req);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data topping tidak valid.' }, { status: 400 });
  }
  const d = parsed.data;

  const slug = d.nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `${slug || 'topping'}-${Date.now().toString(36).slice(-4)}`;

  try {
    await db.insert(toppings).values({
      id,
      nama: d.nama,
      emoji: d.emoji || '🍲',
      foto: d.foto ?? null,
      fotoVersion: d.foto ? Date.now() : 0,
      harga: d.harga,
      stok: d.stok,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('toppings POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal menyimpan topping.' }, { status: 500 });
  }
}