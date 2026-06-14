CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  floor TEXT,
  area_sqm NUMERIC(6,2),
  property_type TEXT DEFAULT 'apartment',
  status TEXT DEFAULT 'vacant',
  monthly_rent INTEGER,
  deposit INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT,
  email TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  deposit INTEGER NOT NULL,
  monthly_rent INTEGER NOT NULL,
  payment_day INTEGER DEFAULT 1,
  contract_file_url TEXT,
  ocr_raw_data JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  bill_year INTEGER NOT NULL,
  bill_month INTEGER NOT NULL,
  water_total INTEGER DEFAULT 0,
  water_usage_total NUMERIC(8,2),
  electric_common INTEGER DEFAULT 0,
  cleaning_fee INTEGER DEFAULT 0,
  elevator_fee INTEGER DEFAULT 0,
  etc_fee INTEGER DEFAULT 0,
  allocation_method TEXT DEFAULT 'area',
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, bill_year, bill_month)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  notif_type TEXT NOT NULL,
  channel TEXT DEFAULT 'kakao',
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contracts_end ON contracts(contract_end);
CREATE INDEX idx_payments_status ON payments(status, due_date);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
