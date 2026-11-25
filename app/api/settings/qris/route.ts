import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';
import { staffGuard } from '@/lib/staff-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [row] = await db
      .select({
        version: storeSettings.qrisVersion,
        at: storeSettings.updatedAt,
        has: sql<boolean>`${storeSettings.qrisImage} is not null`,
      })
      .from(storeSettings)
      .where(eq(storeSettings.id, 'main'));

    const body = row?.has
      ? {
          qrisImage: `/api/settings/qris/image?v=${row.version}`,
          qrisUpdatedAt: row.at.toISOString(),
        }
      : {};
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('qris GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal memuat QRIS.' }, { status: 500 });
  }
}

const putSchema = z.object({
  qrisImage: z.string().max(900_000).regex(/^data:image\/(jpeg|png|webp);base64,/),
});

export async function PUT(req: NextRequest) {
  const denied = staffGuard(req);
  if (denied) return denied;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Gambar QRIS tidak valid.' }, { status: 400 });
  }

  const now = new Date();
  try {
    await db
      .insert(storeSettings)
      .values({ id: 'main', qrisImage: parsed.data.qrisImage, qrisVersion: Date.now(), updatedAt: now })
      .onConflictDoUpdate({
        target: storeSettings.id,
        set: { qrisImage: parsed.data.qrisImage, qrisVersion: Date.now(), updatedAt: now },
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('qris PUT error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal menyimpan QRIS.' }, { status: 500 });
  }
}