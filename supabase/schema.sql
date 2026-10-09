-- ==============================================================================
-- PharmaVault — Complete PostgreSQL Schema with Row Level Security (RLS)
-- Smart Inventory. Safer Medicines.
-- ==============================================================================

-- 1. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  pharmacy_name TEXT DEFAULT 'PharmaVault',
  license_number TEXT,
  phone TEXT,
  currency TEXT DEFAULT 'INR',
  tax_rate_percent NUMERIC(5, 2) DEFAULT 12.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Medicines table
CREATE TABLE IF NOT EXISTS public.medicines (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  strength TEXT,
  unit TEXT,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Discontinued', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Batches table (FEFO tracking)
CREATE TABLE IF NOT EXISTS public.batches (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id TEXT NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  purchase_price NUMERIC(10, 2),
  selling_price NUMERIC(10, 2),
  received_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_batch_dates CHECK (manufacturing_date IS NULL OR expiry_date >= manufacturing_date)
);

-- 5. Dispensing records table
CREATE TABLE IF NOT EXISTS public.dispensing_records (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicine_id TEXT NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  patient_name TEXT,
  prescription_number TEXT,
  prescribed_by TEXT,
  notes TEXT,
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unit_price NUMERIC(10, 2),
  total_amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Dispensing batch allocations (details of batches deducted per dispensing event)
CREATE TABLE IF NOT EXISTS public.dispensing_batch_allocations (
  id TEXT PRIMARY KEY,
  dispensing_id TEXT NOT NULL REFERENCES public.dispensing_records(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Sales bills table (Invoices & Billing)
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  bill_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Partially Paid', 'Unpaid', 'Refunded')),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Net Banking', 'Other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Cancelled', 'Refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Sales bill items table (Snapshot of pricing, batches, and medicines)
CREATE TABLE IF NOT EXISTS public.sales_bill_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL REFERENCES public.sales_bills(id) ON DELETE CASCADE,
  medicine_id TEXT NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
  medicine_name_snapshot TEXT NOT NULL,
  batch_number_snapshot TEXT NOT NULL,
  expiry_date_snapshot DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Payment records table
CREATE TABLE IF NOT EXISTS public.payment_records (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL REFERENCES public.sales_bills(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Net Banking', 'Other')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'Completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON public.medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_user_id ON public.batches(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_medicine_expiry ON public.batches(medicine_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_dispensing_user_id ON public.dispensing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_medicine ON public.dispensing_records(medicine_id, dispensed_at);
CREATE INDEX IF NOT EXISTS idx_sales_bills_user_id ON public.sales_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_date ON public.sales_bills(user_id, bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_bill_items_bill_id ON public.sales_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_bill_id ON public.payment_records(bill_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispensing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispensing_batch_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Profiles: user can view and edit their own profile
DROP POLICY IF EXISTS "profiles_user_all" ON public.profiles;
CREATE POLICY "profiles_user_all" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Medicines: isolated to auth.uid()
DROP POLICY IF EXISTS "medicines_user_all" ON public.medicines;
CREATE POLICY "medicines_user_all" ON public.medicines
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppliers: isolated to auth.uid()
DROP POLICY IF EXISTS "suppliers_user_all" ON public.suppliers;
CREATE POLICY "suppliers_user_all" ON public.suppliers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Batches: isolated to auth.uid()
DROP POLICY IF EXISTS "batches_user_all" ON public.batches;
CREATE POLICY "batches_user_all" ON public.batches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Dispensing records: isolated to auth.uid()
DROP POLICY IF EXISTS "dispensing_user_all" ON public.dispensing_records;
CREATE POLICY "dispensing_user_all" ON public.dispensing_records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Dispensing allocations: check ownership through dispensing record
DROP POLICY IF EXISTS "dispensing_alloc_user_all" ON public.dispensing_batch_allocations;
CREATE POLICY "dispensing_alloc_user_all" ON public.dispensing_batch_allocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dispensing_records dr
      WHERE dr.id = dispensing_batch_allocations.dispensing_id
      AND dr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dispensing_records dr
      WHERE dr.id = dispensing_batch_allocations.dispensing_id
      AND dr.user_id = auth.uid()
    )
  );

-- Sales bills: isolated to auth.uid()
DROP POLICY IF EXISTS "sales_bills_user_all" ON public.sales_bills;
CREATE POLICY "sales_bills_user_all" ON public.sales_bills
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sales bill items: isolated to auth.uid()
DROP POLICY IF EXISTS "sales_bill_items_user_all" ON public.sales_bill_items;
CREATE POLICY "sales_bill_items_user_all" ON public.sales_bill_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Payment records: isolated to auth.uid()
DROP POLICY IF EXISTS "payment_records_user_all" ON public.payment_records;
CREATE POLICY "payment_records_user_all" ON public.payment_records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, pharmacy_name, currency)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pharmacist'),
    COALESCE(NEW.raw_user_meta_data->>'pharmacy_name', 'PharmaVault'),
    'INR'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION FOR MEDICINE IMAGES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Allow authenticated users to upload and manage their folder
DROP POLICY IF EXISTS "medicine_images_insert" ON storage.objects;
CREATE POLICY "medicine_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medicine-images');

DROP POLICY IF EXISTS "medicine_images_select" ON storage.objects;
CREATE POLICY "medicine_images_select" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'medicine-images');

DROP POLICY IF EXISTS "medicine_images_delete" ON storage.objects;
CREATE POLICY "medicine_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'medicine-images');
