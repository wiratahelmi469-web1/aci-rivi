import { NextRequest, NextResponse } from 'next/server';
import { asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { toppings } from '@/lib/db/schema';
import { staffGuard } from '@/lib/staff-session';
import {
  getToppingImageUrl,
  isValidToppingPhoto,
  TOPPING_PHOTO_DATA_URL_REGEX,
} from '@/lib/topping-image';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: toppings.id,
        nama: toppings.nama,
        hasFoto: sql<boolean>`${toppings.foto} is not null`,
        fotoVersion: toppings.fotoVersion,
        imageUrl: toppings.imageUrl,
        harga: toppings.harga,
        stok: toppings.stok,
        tersedia: toppings.tersedia,
      })
      .from(toppings)
      .orderBy(asc(toppings.createdAt), asc(toppings.id));

    const data = rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      imageUrl:
        r.imageUrl ??
        (r.hasFoto ? getToppingImageUrl(r.id, r.fotoVersion) : undefined),
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
  foto: z.string().max(2_800_100).regex(TOPPING_PHOTO_DATA_URL_REGEX).optional(),
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
  if (d.foto && !isValidToppingPhoto(d.foto)) {
    return NextResponse.json(
      { error: 'Foto tidak valid. Gunakan JPG, PNG, atau WebP maksimal 2 MB.' },
      { status: 400 }
    );
  }

  const slug = d.nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `${slug || 'topping'}-${Date.now().toString(36).slice(-4)}`;
  const fotoVersion = d.foto ? Date.now() : 0;

  try {
    await db.insert(toppings).values({
      id,
      nama: d.nama,
      foto: d.foto ?? null,
      fotoVersion,
      imageUrl: d.foto ? getToppingImageUrl(id, fotoVersion) : null,
      harga: d.harga,
      stok: d.stok,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('toppings POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal menyimpan topping.' }, { status: 500 });
  }
}