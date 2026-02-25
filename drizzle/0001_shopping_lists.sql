CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  raw_name text NOT NULL,
  quantity numeric(14,3),
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shopping_list_items_list_id_idx ON shopping_list_items (list_id);
