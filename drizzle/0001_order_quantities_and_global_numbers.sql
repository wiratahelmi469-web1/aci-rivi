BEGIN;

LOCK TABLE orders IN ACCESS EXCLUSIVE MODE;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_tanggal_nomor;
DROP INDEX IF EXISTS orders_tanggal_nomor_uq;
DROP INDEX IF EXISTS orders_nomor_uq;

CREATE SEQUENCE IF NOT EXISTS orders_nomor_seq;

WITH ordered_orders AS (
  SELECT id, row_number() OVER (ORDER BY waktu_dibuat, id)::integer AS nomor_baru
  FROM orders
)
UPDATE orders AS current_order
SET nomor = ordered_orders.nomor_baru
FROM ordered_orders
WHERE current_order.id = ordered_orders.id;

ALTER SEQUENCE orders_nomor_seq OWNED BY orders.nomor;
SELECT setval(
  'orders_nomor_seq',
  COALESCE((SELECT max(nomor) FROM orders), 0) + 1,
  false
);
ALTER TABLE orders ALTER COLUMN nomor SET DEFAULT nextval('orders_nomor_seq');

UPDATE orders AS current_order
SET daftar_topping = (
  SELECT jsonb_agg(
    CASE
      WHEN item ? 'quantity' THEN item
      ELSE item || '{"quantity":1}'::jsonb
    END
    ORDER BY item_order
  )
  FROM jsonb_array_elements(current_order.daftar_topping)
    WITH ORDINALITY AS topping_item(item, item_order)
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(current_order.daftar_topping) AS topping_item(item)
  WHERE NOT (item ? 'quantity')
);

CREATE UNIQUE INDEX orders_nomor_uq ON orders (nomor);

COMMIT;
