-- ═══════════════════════════════════════════════════════════════════════════
-- PARADELLE CHOCOLATES — Phase 3 consolidated migration
-- Run on Supabase (SQL editor or `supabase db push`) after Phase 1–2 schemas.
-- Idempotent: safe to re-run. Money columns are integer PAISE.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Money conversion guard: convert any legacy rupee integers to paise ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM products LIMIT 1) AND
     (SELECT max(price) FROM products) < 2000 THEN
    UPDATE products SET price = price * 100, mrp = mrp * 100;
    UPDATE coupons  SET min_subtotal = min_subtotal * 100,
                        max_discount  = CASE WHEN max_discount IS NULL THEN NULL ELSE max_discount * 100 END;
    UPDATE orders   SET subtotal = subtotal * 100, discount = discount * 100,
                        shipping = shipping * 100, total = total * 100;
    UPDATE order_items SET unit_price = unit_price * 100, line_total = line_total * 100;
    UPDATE payments SET amount = amount * 100;
    UPDATE refunds  SET amount = amount * 100;
    UPDATE settings SET value = (value::int * 100)::text
      WHERE key IN ('shipping.flat_fee', 'shipping.free_threshold') AND value ~ '^\d+$';
  END IF;
END $$;

-- ── 2. Food-label columns on products ───────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fssai_license      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manufacturer       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country_of_origin  text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS best_before_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS net_quantity_label text NOT NULL DEFAULT '';

-- ── 3. New Phase-3 tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL CHECK (pincode ~ '^\d{6}$'),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  slug text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0 AND qty <= 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, slug)
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty integer NOT NULL CHECK (qty > 0),
  released boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event text NOT NULL,
  order_number text,
  razorpay_payment_id text,
  signature_valid boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  processing_result text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon text NOT NULL REFERENCES coupons(code) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email text NOT NULL,
  discount_paise integer NOT NULL CHECK (discount_paise >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, coupon)
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Standard (all India)',
  flat_fee_paise integer NOT NULL DEFAULT 9900 CHECK (flat_fee_paise >= 0),
  free_threshold_paise integer NOT NULL DEFAULT 150000 CHECK (free_threshold_paise >= 0),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO shipping_rules (name, flat_fee_paise, free_threshold_paise, active)
SELECT 'Standard (all India)', 9900, 150000, true
WHERE NOT EXISTS (SELECT 1 FROM shipping_rules);

-- ── 4. Integrity constraints (idempotent via DO guards) ─────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_nonneg') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_price_nonneg CHECK (price >= 0 AND mrp >= price AND stock >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_total_nonneg
      CHECK (subtotal >= 0 AND discount >= 0 AND shipping >= 0 AND total >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_qty_positive') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_qty_positive CHECK (qty > 0);
  END IF;
END $$;

-- ── 5. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS orders_email_idx            ON orders (email);
CREATE INDEX IF NOT EXISTS orders_status_idx           ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx          ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_rzp_order_idx        ON orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx       ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_slug_idx        ON order_items (slug);
CREATE INDEX IF NOT EXISTS product_images_product_idx  ON product_images (product_id, position);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_state_idx      ON inventory_reservations (released, expires_at);
CREATE INDEX IF NOT EXISTS reservations_order_idx      ON inventory_reservations (order_id);
CREATE INDEX IF NOT EXISTS payments_order_idx          ON payments (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_rzp_payment_uidx ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS refunds_order_idx           ON refunds (order_id);
CREATE INDEX IF NOT EXISTS webhook_events_event_idx    ON razorpay_webhook_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS coupon_redemptions_code_idx ON coupon_redemptions (coupon);
CREATE INDEX IF NOT EXISTS addresses_user_idx          ON addresses (user_id);
CREATE INDEX IF NOT EXISTS cart_items_cart_idx         ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS activity_created_idx        ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS products_status_sort_idx    ON products (status, sort);

-- ── 6. Row Level Security (Supabase-aware; skipped harmlessly elsewhere) ────
-- The Next.js server connects as the database owner/service role, which bypasses
-- RLS by design (server code enforces authorization). These policies protect any
-- direct anon/authenticated client access via PostgREST.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'ALTER TABLE products ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "public reads active products"
      ON products FOR SELECT USING (status = 'active')$p$;

    EXECUTE 'ALTER TABLE product_images ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "public reads images of visible products"
      ON product_images FOR SELECT
      USING (EXISTS (SELECT 1 FROM products pr WHERE pr.id = product_id AND pr.status <> 'archived'))$p$;

    EXECUTE 'ALTER TABLE orders ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "customers read own orders"
      ON orders FOR SELECT USING (user_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "admins read all orders"
      ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM admins a WHERE a.email = auth.jwt() ->> 'email' AND a.active))$p$;

    EXECUTE 'ALTER TABLE order_items ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "order items follow parent order"
      ON order_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid())))$p$;

    EXECUTE 'ALTER TABLE addresses ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "own addresses only"
      ON addresses FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;

    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "own profile only"
      ON profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid())$p$;

    EXECUTE 'ALTER TABLE carts ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "own cart only"
      ON carts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;

    EXECUTE 'ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "own cart items"
      ON cart_items FOR ALL
      USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))$p$;

    EXECUTE 'ALTER TABLE pincodes ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "public reads serviceable pincodes"
      ON pincodes FOR SELECT USING (serviceable = true)$p$;

    EXECUTE 'ALTER TABLE coupons ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "public reads active coupons only for validation"
      ON coupons FOR SELECT USING (active = true)$p$;

    EXECUTE 'ALTER TABLE site_content ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY IF NOT EXISTS "public reads cms"
      ON site_content FOR SELECT USING (true)$p$;
  END IF;
END $$;
