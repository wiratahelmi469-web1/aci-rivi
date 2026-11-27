import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export type BestSellingToppingRow = {
  id: string;
  nama: string;
  emoji: string;
  hasFoto: boolean;
  fotoVersion: number;
  harga: number;
  terjual: number;
}

export async function getBestSellingToppings(): Promise<BestSellingToppingRow[]> {
  const { rows } = await db.execute<BestSellingToppingRow>(sql`
    SELECT
      available_topping.id,
      available_topping.nama,
      available_topping.emoji,
      (available_topping.foto IS NOT NULL) AS "hasFoto",
      available_topping.foto_version AS "fotoVersion",
      available_topping.harga,
      SUM(COALESCE((item->>'quantity')::int, 1))::int AS terjual
    FROM orders
    CROSS JOIN LATERAL jsonb_array_elements(orders.daftar_topping) AS topping(item)
    INNER JOIN toppings AS available_topping
      ON available_topping.id = item->>'id'
    WHERE orders.status_bayar = 'Lunas'
      AND available_topping.tersedia = true
      AND available_topping.stok > 0
    GROUP BY available_topping.id
    ORDER BY terjual DESC, available_topping.id ASC
    LIMIT 6
  `);
  return rows;
}
