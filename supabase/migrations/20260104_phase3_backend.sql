-- ═══════════════════════════════════════════════════════════════════════════
-- PARADELLE CHOCOLATES — consolidated backend migration (standalone)
-- Works on a FRESH Supabase project via the SQL editor OR against the existing
-- local Postgres. Fully idempotent: every statement is guarded, safe to re-run.
-- Money columns are integer PAISE. Run order: this file → seed → upload-media.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Helpers ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ── 1. All tables (phases 1–3 unified) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'staff',              -- 'super' | 'staff'
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  admin_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text NOT NULL,
  line text NOT NULL DEFAULT 'The Signature Collection',
  status text NOT NULL DEFAULT 'active',           -- active | draft | archived
  cocoa_percent integer NOT NULL DEFAULT 45,
  weight_grams integer NOT NULL DEFAULT 50,
  price integer NOT NULL,                          -- paise
  mrp integer NOT NULL,                            -- paise
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 12,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tasting_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  allergens jsonb NOT NULL DEFAULT '[]'::jsonb,
  cross_contact text NOT NULL DEFAULT '',
  nutrition jsonb NOT NULL,
  storage text NOT NULL DEFAULT '',
  shipping_note text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT '#C9A66B',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  fssai_license text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  country_of_origin text NOT NULL DEFAULT 'India',
  best_before_months integer NOT NULL DEFAULT 12,
  net_quantity_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fssai_license      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manufacturer       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country_of_origin  text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS best_before_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS net_quantity_label text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,                            -- receipt | correction | damage | sample | sale | refund | other
  note text,
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  subtotal integer NOT NULL,                       -- paise
  discount integer NOT NULL DEFAULT 0,
  coupon text,
  shipping integer NOT NULL DEFAULT 0,
  total integer NOT NULL,                          -- paise
  -- payment_pending → paid → crafting → shipped → delivered | cancelled
  -- `paid` may ONLY be set by verified Razorpay capture paths (see payments-core).
  status text NOT NULL DEFAULT 'payment_pending',
  payment_provider text NOT NULL DEFAULT 'razorpay',
  razorpay_order_id text,
  razorpay_payment_id text,
  shipping_provider text,
  tracking_id text,
  tracking_url text,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Legacy-safe column adds for very old Phase-1/2 databases
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS tracking_id text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  qty integer NOT NULL,
  unit_price integer NOT NULL,                     -- paise snapshot
  line_total integer NOT NULL                      -- paise snapshot
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay',
  status text NOT NULL DEFAULT 'created',          -- created | authorized | captured | failed | refunded
  amount integer NOT NULL,                         -- paise (negative for refund ledger rows)
  currency text NOT NULL DEFAULT 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  method text,
  verified boolean NOT NULL DEFAULT false,         -- true only after signature/API verification
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  amount integer NOT NULL,                         -- paise
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested',        -- requested | processed | rejected
  razorpay_refund_id text,
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'percent',
  value integer NOT NULL,                          -- percent points
  min_subtotal integer NOT NULL DEFAULT 0,         -- paise
  max_discount integer,                            -- paise
  description text NOT NULL DEFAULT '',
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS usage_limit integer,
  ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_discount integer;

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pincodes (
  pincode text PRIMARY KEY,
  city text,
  serviceable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
  event_key text NOT NULL UNIQUE,                  -- x-razorpay-event-id or sha256(raw body)
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

-- ── 2. Legacy rupee→paise conversion guard (no-op on fresh projects) ────────
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL
     AND EXISTS (SELECT 1 FROM products)
     AND (SELECT max(price) FROM products) < 2000 THEN
    UPDATE products SET price = price * 100, mrp = mrp * 100;
    UPDATE coupons  SET min_subtotal = min_subtotal * 100,
                        max_discount  = CASE WHEN max_discount IS NULL THEN NULL ELSE max_discount * 100 END;
    UPDATE orders   SET subtotal = subtotal * 100, discount = discount * 100,
                        shipping = shipping * 100, total = total * 100;
    UPDATE order_items SET unit_price = unit_price * 100, line_total = line_total * 100;
    UPDATE payments SET amount = amount * 100 WHERE amount >= 0;
    UPDATE refunds  SET amount = amount * 100;
    UPDATE settings SET value = (value::int * 100)::text
      WHERE key IN ('shipping.flat_fee', 'shipping.free_threshold') AND value ~ '^\d+$';
  END IF;
END $$;

-- ── 3. Integrity constraints ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_nonneg') THEN
    ALTER TABLE products ADD CONSTRAINT products_price_nonneg CHECK (price >= 0 AND mrp >= price AND stock >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_total_nonneg CHECK (subtotal >= 0 AND discount >= 0 AND shipping >= 0 AND total >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_qty_positive') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_qty_positive CHECK (qty > 0);
  END IF;
END $$;

-- ── 4. Indexes ──────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS sessions_user_idx           ON sessions (user_id);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx    ON admin_sessions (admin_id);

-- ── 5. Row Level Security (activates on Supabase where `auth` exists) ───────
-- The Next.js server connects with the service role / owner, which bypasses RLS
-- by design (server code enforces authorization). Policies below additionally
-- guard any direct anon/authenticated (PostgREST/SDK) access.
-- NOTE: CREATE POLICY has no IF NOT EXISTS — guarded via pg_policies.
DO $$
DECLARE
  has_auth boolean := EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth');
BEGIN
  IF NOT has_auth THEN RETURN; END IF;

  EXECUTE 'ALTER TABLE products ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE product_images ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE order_items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE addresses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE carts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE pincodes ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE coupons ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE site_content ENABLE ROW LEVEL SECURITY';

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='public reads active products') THEN
    EXECUTE $p$CREATE POLICY "public reads active products" ON products FOR SELECT USING (status = 'active')$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_images' AND policyname='public reads images of visible products') THEN
    EXECUTE $p$CREATE POLICY "public reads images of visible products" ON product_images FOR SELECT
      USING (EXISTS (SELECT 1 FROM products pr WHERE pr.id = product_id AND pr.status <> 'archived'))$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='customers read own orders') THEN
    EXECUTE $p$CREATE POLICY "customers read own orders" ON orders FOR SELECT USING (user_id = auth.uid())$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='admins read all orders') THEN
    EXECUTE $p$CREATE POLICY "admins read all orders" ON orders FOR SELECT
      USING (EXISTS (SELECT 1 FROM admins a WHERE a.email = auth.jwt() ->> 'email' AND a.active))$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='order items follow parent order') THEN
    EXECUTE $p$CREATE POLICY "order items follow parent order" ON order_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid()))$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='addresses' AND policyname='own addresses only') THEN
    EXECUTE $p$CREATE POLICY "own addresses only" ON addresses FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='own profile only') THEN
    EXECUTE $p$CREATE POLICY "own profile only" ON profiles FOR ALL
      USING (id = auth.uid()) WITH CHECK (id = auth.uid())$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='carts' AND policyname='own cart only') THEN
    EXECUTE $p$CREATE POLICY "own cart only" ON carts FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cart_items' AND policyname='own cart items') THEN
    EXECUTE $p$CREATE POLICY "own cart items" ON cart_items FOR ALL
      USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pincodes' AND policyname='public reads serviceable pincodes') THEN
    EXECUTE $p$CREATE POLICY "public reads serviceable pincodes" ON pincodes FOR SELECT USING (serviceable = true)$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='public reads active coupons only for validation') THEN
    EXECUTE $p$CREATE POLICY "public reads active coupons only for validation" ON coupons FOR SELECT USING (active = true)$p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_content' AND policyname='public reads cms') THEN
    EXECUTE $p$CREATE POLICY "public reads cms" ON site_content FOR SELECT USING (true)$p$;
  END IF;
END $$;
