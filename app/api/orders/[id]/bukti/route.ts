import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { getActor, imageResponse } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { staff, uid } = await getActor(req);

  const [row] = await db
    .select({ uid: orders.uid, bukti: orders.buktiBayar })
    .from(orders)
    .where(eq(orders.id, id));

  // Hanya pegawai atau pemilik pesanan yang boleh melihat bukti bayar
  if (!row || (!staff && (!uid || row.uid !== uid))) {
    return new Response(null, { status: 404 });
  }
  return imageResponse(row.bukti, 'private, max-age=31536000, immutable');
}