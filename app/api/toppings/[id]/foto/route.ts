import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { toppings } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select({ foto: toppings.foto })
    .from(toppings)
    .where(eq(toppings.id, id));

  const match = row?.foto
    ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(row.foto)
    : null;
  if (!match) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(Buffer.from(match[2], 'base64')), {
    headers: {
      'Content-Type': match[1],
      // Aman di-cache lama: URL berubah (?v=) setiap foto diganti
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
