import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await db.execute<{ id: string; terjual: number }>(sql`
      SELECT item->>'id' AS id, COUNT(*)::int AS terjual
      FROM orders
      CROSS JOIN LATERAL jsonb_array_elements(orders.daftar_topping) AS topping(item)
      INNER JOIN toppings AS available_topping
        ON available_topping.id = item->>'id'
      WHERE orders.status_bayar = 'Lunas'
        AND available_topping.tersedia = true
        AND available_topping.stok > 0
      GROUP BY item->>'id'
      ORDER BY terjual DESC, id ASC
      LIMIT 6
    `);

    return NextResponse.json(
      { toppingIds: rows.map((row) => row.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error(
      'best sellers GET error:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: 'Gagal memuat topping terlaris.' },
      { status: 500 }
    );
  }
}
