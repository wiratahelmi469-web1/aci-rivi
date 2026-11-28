import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
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

const patchSchema = z.object({
  nama: z.string().trim().min(1).max(60).optional(),
  foto: z
    .string()
    .max(2_800_100)
    .regex(TOPPING_PHOTO_DATA_URL_REGEX)
    .nullable()
    .optional(),
  harga: z.number().int().min(0).max(10_000_000).optional(),
  stok: z.number().int().min(0).max(100_000).optional(),
  tersedia: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = staffGuard(req);
  if (denied) return denied;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  }

  if (parsed.data.foto && !isValidToppingPhoto(parsed.data.foto)) {
    return NextResponse.json(
      { error: 'Foto tidak valid. Gunakan JPG, PNG, atau WebP maksimal 2 MB.' },
      { status: 400 }
    );
  }

  const { foto, ...rest } = parsed.data;
  const set: Partial<typeof toppings.$inferInsert> = {
    ...rest,
    updatedAt: new Date(),
  };
  if (foto !== undefined) {
    set.foto = foto;
    const version = foto ? Date.now() : 0;
    set.fotoVersion = version;
    set.imageUrl = foto ? getToppingImageUrl(id, version) : null;
  }

  try {
    const res = await db
      .update(toppings)
      .set(set)
      .where(eq(toppings.id, id))
      .returning({ id: toppings.id });
    if (res.length === 0) {
      return NextResponse.json({ error: 'Topping tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('toppings PATCH error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal menyimpan perubahan.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = staffGuard(req);
  if (denied) return denied;
  const { id } = await params;

  try {
    await db.delete(toppings).where(eq(toppings.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('toppings DELETE error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal menghapus topping.' }, { status: 500 });
  }
}