-- Create invoice_items table for editable line items with per-line fees
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  pickup_fee DECIMAL(10,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  custom_fee_label VARCHAR(100),
  custom_fee_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  -- Link back to original request item if applicable
  request_item_id UUID REFERENCES request_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_request_item_id ON invoice_items(request_item_id);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow authenticated users full access for now)
CREATE POLICY "Allow authenticated read invoice_items" ON invoice_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert invoice_items" ON invoice_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update invoice_items" ON invoice_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete invoice_items" ON invoice_items
  FOR DELETE TO authenticated USING (true);

-- Function to update invoice totals when items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
  v_tax DECIMAL(10,2);
  v_fees DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Calculate totals from invoice_items
  SELECT
    COALESCE(SUM(quantity * unit_price), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(pickup_fee + shipping_fee + COALESCE(custom_fee_amount, 0)), 0)
  INTO v_subtotal, v_tax, v_fees
  FROM invoice_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  v_total := v_subtotal + v_tax + v_fees;

  -- Update the invoice
  UPDATE invoices
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax,
    total = v_total + COALESCE(shipping_amount, 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update invoice totals
DROP TRIGGER IF EXISTS trigger_update_invoice_totals_insert ON invoice_items;
CREATE TRIGGER trigger_update_invoice_totals_insert
  AFTER INSERT ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

DROP TRIGGER IF EXISTS trigger_update_invoice_totals_update ON invoice_items;
CREATE TRIGGER trigger_update_invoice_totals_update
  AFTER UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

DROP TRIGGER IF EXISTS trigger_update_invoice_totals_delete ON invoice_items;
CREATE TRIGGER trigger_update_invoice_totals_delete
  AFTER DELETE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invoice_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_items_updated_at ON invoice_items;
CREATE TRIGGER set_invoice_items_updated_at
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_items_updated_at();

-- Migrate existing invoices: copy request_items to invoice_items
INSERT INTO invoice_items (invoice_id, name, quantity, unit_price, pickup_fee, request_item_id)
SELECT
  i.id as invoice_id,
  ri.name,
  ri.quantity,
  COALESCE(ri.actual_price, ri.estimated_price, 0) as unit_price,
  COALESCE(ri.pickup_fee, 0) as pickup_fee,
  ri.id as request_item_id
FROM invoices i
JOIN requests r ON r.id = i.request_id
JOIN request_items ri ON ri.request_id = r.id
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
);
