import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';
import { imageResponse } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [row] = await db
    .select({ img: storeSettings.qrisImage })
    .from(storeSettings)
    .where(eq(storeSettings.id, 'main'));
  // URL berubah (?v=) setiap QRIS diganti, jadi aman di-cache lama
  return imageResponse(row?.img, 'public, max-age=31536000, immutable');
}