-- Replace the four product galleries with the owner-supplied image sequence and
-- align all shipping rules/copy with free delivery from ₹499.
-- Run after 20260104_phase3_backend.sql and scripts/seed.ts.
BEGIN;

DO $$
DECLARE
  missing_slugs text;
BEGIN
  SELECT string_agg(required.slug, ', ')
  INTO missing_slugs
  FROM (VALUES
    ('signature-milk'),
    ('signature-dark'),
    ('crunchy-nut'),
    ('pistachio-filled')
  ) AS required(slug)
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.slug = required.slug);

  IF missing_slugs IS NOT NULL THEN
    RAISE EXCEPTION 'Seed the four storefront products before applying this update. Missing: %', missing_slugs;
  END IF;
END $$;

DELETE FROM product_images
WHERE product_id IN (
  SELECT id FROM products
  WHERE slug IN ('signature-milk', 'signature-dark', 'crunchy-nut', 'pistachio-filled')
);

INSERT INTO product_images (product_id, url, alt, position)
SELECT p.id, supplied.url, supplied.alt, supplied.position
FROM (VALUES
  ('signature-milk', '/images/products/signature-milk-1.webp', 'Signature Milk Chocolate — product photograph 1', 0),
  ('signature-milk', '/images/products/signature-milk-2.webp', 'Signature Milk Chocolate — product photograph 2', 1),
  ('signature-milk', '/images/products/signature-milk-3.webp', 'Signature Milk Chocolate — product photograph 3', 2),
  ('signature-milk', '/images/products/signature-milk-4.webp', 'Signature Milk Chocolate — product photograph 4', 3),
  ('signature-dark', '/images/products/signature-dark-1.webp', 'Signature Dark Chocolate — product photograph 1', 0),
  ('signature-dark', '/images/products/signature-dark-2.webp', 'Signature Dark Chocolate — product photograph 2', 1),
  ('signature-dark', '/images/products/signature-dark-3.webp', 'Signature Dark Chocolate — product photograph 3', 2),
  ('signature-dark', '/images/products/signature-dark-4.webp', 'Signature Dark Chocolate — product photograph 4', 3),
  ('crunchy-nut', '/images/products/crunchy-nut-1.webp', 'Crunchy Nut Chocolate — product photograph 1', 0),
  ('crunchy-nut', '/images/products/crunchy-nut-2.webp', 'Crunchy Nut Chocolate — product photograph 2', 1),
  ('crunchy-nut', '/images/products/crunchy-nut-3.webp', 'Crunchy Nut Chocolate — product photograph 3', 2),
  ('crunchy-nut', '/images/products/crunchy-nut-4.webp', 'Crunchy Nut Chocolate — product photograph 4', 3),
  ('pistachio-filled', '/images/products/pistachio-filled-1.webp', 'Pistachio Filled Chocolate — product photograph 1', 0),
  ('pistachio-filled', '/images/products/pistachio-filled-2.webp', 'Pistachio Filled Chocolate — product photograph 2', 1),
  ('pistachio-filled', '/images/products/pistachio-filled-3.webp', 'Pistachio Filled Chocolate — product photograph 3', 2),
  ('pistachio-filled', '/images/products/pistachio-filled-4.webp', 'Pistachio Filled Chocolate — product photograph 4', 3)
) AS supplied(slug, url, alt, position)
JOIN products p ON p.slug = supplied.slug;

ALTER TABLE shipping_rules
  ALTER COLUMN free_threshold_paise SET DEFAULT 49900;

UPDATE shipping_rules
SET free_threshold_paise = 49900,
    updated_at = now()
WHERE active = true;

INSERT INTO shipping_rules (name, flat_fee_paise, free_threshold_paise, active)
SELECT 'Standard (all India)', 9900, 49900, true
WHERE NOT EXISTS (SELECT 1 FROM shipping_rules WHERE active = true);

INSERT INTO settings (key, value, updated_at)
VALUES ('shipping.free_threshold', '49900', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

UPDATE products
SET shipping_note = replace(shipping_note, '₹1,500', '₹499'),
    updated_at = now()
WHERE shipping_note LIKE '%₹1,500%';

UPDATE site_content
SET value = replace(value::text, '₹1,500', '₹499')::jsonb,
    updated_at = now()
WHERE value::text LIKE '%₹1,500%';

COMMIT;
