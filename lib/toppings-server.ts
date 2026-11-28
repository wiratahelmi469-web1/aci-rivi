import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export type BestSellingToppingRow = {
  id: string;
  nama: string;
  imageUrl: string | null;
  harga: number;
  terjual: number;
}

export async function getBestSellingToppings(): Promise<BestSellingToppingRow[]> {
  const { rows } = await db.execute<BestSellingToppingRow>(sql`
    SELECT
      available_topping.id,
      available_topping.nama,
      COALESCE(
        available_topping.image_url,
        CASE
          WHEN available_topping.foto IS NOT NULL
          THEN '/api/toppings/' || available_topping.id || '/foto?v=' || available_topping.foto_version
          ELSE NULL
        END
      ) AS "imageUrl",
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
