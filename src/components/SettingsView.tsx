import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  ShieldCheck,
  Database,
  RefreshCw,
  Building2,
  User,
  Phone,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  FileCode,
} from 'lucide-react';
import { AppData, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { setCustomSupabaseConfig, clearCustomSupabaseConfig } from '../utils/supabaseClient';

interface SettingsViewProps {
  data: AppData;
  profile?: UserProfile | null;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<boolean>;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onClearAllData: () => void;
  onImportData: (data: AppData) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  profile,
  onUpdateProfile,
  onLoadDemoData,
  onClearDemoData,
  onClearAllData,
  onImportData,
}) => {
  const { user, isSupabaseConnected, configStatus, refreshSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [pharmacyName, setPharmacyName] = useState(profile?.pharmacyName || 'PharmaVault');
  const [fullName, setFullName] = useState(profile?.fullName || 'Pharmacist');
  const [licenseNumber, setLicenseNumber] = useState(profile?.licenseNumber || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currency, setCurrency] = useState(profile?.currency || 'INR');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(profile?.taxRatePercent ?? 12.0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Custom Supabase credentials state
  const [customUrl, setCustomUrl] = useState(configStatus.url);
  const [customKey, setCustomKey] = useState(configStatus.anonKey);
  const [isEditingSupabase, setIsEditingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProfile) return;
    setIsSavingProfile(true);
    await onUpdateProfile({
      pharmacyName,
      fullName,
      licenseNumber,
      phone,
      currency,
      taxRatePercent,
    });
    setIsSavingProfile(false);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  const handleSaveCustomSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (setCustomSupabaseConfig(customUrl, customKey)) {
      refreshSession();
      setIsEditingSupabase(false);
      alert('Supabase credentials saved successfully!');
    } else {
      alert('Please enter a valid Supabase URL starting with https:// and Anon key.');
    }
  };

  const handleClearCustomSupabase = () => {
    if (confirm('Reset custom Supabase credentials to environment defaults?')) {
      clearCustomSupabaseConfig();
      refreshSession();
      setCustomUrl('');
      setCustomKey('');
    }
  };

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `pharmavault_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onImportData({
            medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
            batches: Array.isArray(parsed.batches) ? parsed.batches : [],
            suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
            dispensingRecords: Array.isArray(parsed.dispensingRecords)
              ? parsed.dispensingRecords
              : [],
            salesBills: Array.isArray(parsed.salesBills) ? parsed.salesBills : [],
            isDemoData: Boolean(parsed.isDemoData),
          });
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copySqlScript = () => {
    const sql = `-- PharmaVault Supabase Setup Script (Execute in Supabase SQL Editor)
-- 1. Create Profiles
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

-- 2. Create Medicines
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
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Batches
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Dispensing Records
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

-- 6. Create Sales Bills
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
  payment_status TEXT NOT NULL DEFAULT 'Paid',
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispensing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "user_medicines" ON public.medicines FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_suppliers" ON public.suppliers FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_batches" ON public.batches FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_dispensing" ON public.dispensing_records FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_sales" ON public.sales_bills FOR ALL TO authenticated USING (auth.uid() = user_id);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          System Settings & SaaS Configuration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure your pharmacy clinical dispensary, taxes, Supabase database, and inventory backups.
        </p>
      </div>

      {/* Supabase Connection Status Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Supabase PostgreSQL & Auth Connection
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isSupabaseConnected
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                }`}>
                  {isSupabaseConnected ? 'Connected (Multi-User RLS)' : 'Setup Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                {isSupabaseConnected
                  ? `Active connection via ${configStatus.source === 'env' ? 'Vercel / Vite Environment Variables' : 'Local Custom Configuration'}. All medicines, batches, and bills are isolated per pharmacist account.`
                  : 'Supabase credentials are not yet configured. Provide your project URL and anon key to enable remote persistent PostgreSQL and multi-user login.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingSupabase(!isEditingSupabase)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            {isEditingSupabase ? 'Hide Credentials' : 'Edit Credentials'}
          </button>
        </div>

        {/* Credentials Editor */}
        {isEditingSupabase && (
          <form onSubmit={handleSaveCustomSupabase} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://xyzproject.supabase.co"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Anon / Public Key
              </label>
              <textarea
                required
                rows={2}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Save & Apply Connection
              </button>
              {configStatus.source === 'custom' && (
                <button
                  type="button"
                  onClick={handleClearCustomSupabase}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Reset to Environment Defaults
                </button>
              )}
            </div>
          </form>
        )}

        {/* Copy SQL Schema Helper */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileCode className="w-4 h-4 text-teal-600" />
            <span>Database Tables & RLS Migration Schema</span>
          </div>

          <button
            onClick={copySqlScript}
            className="px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSql ? 'SQL Copied to Clipboard!' : 'Copy Supabase SQL Script'}
          </button>
        </div>
      </div>

      {/* Pharmacy Profile Settings Form */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Pharmacy & Invoice Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              These details appear on printed invoices, tax receipts, and dispensary reports.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          {profileSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Pharmacy profile and billing preferences updated successfully.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pharmacy / Facility Name
              </label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="PharmaVault Healthcare"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pharmacist In-Charge Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Sarah Jenkins, PharmD"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Drug License / Registration Number
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="DL-PH-984210/2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Helpline / Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 44 2834 0192"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="INR">Indian Rupee (₹ INR)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="EUR">Euro (€ EUR)</option>
                <option value="GBP">British Pound (£ GBP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Standard Applicable GST / Tax (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={50}
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile & Billing Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Demo Data Management Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Optional Demonstration Data
                </h3>
                {data.isDemoData && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                    Demo Data Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                The pharmacy database defaults to 100% empty for real pharmacist operations. You may optionally populate sample medicines, FEFO batches, and suppliers to inspect workflow functionality.
              </p>
            </div>
          </div>
        </div>

        {data.isDemoData ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Demo data is currently loaded in this session.</span>
            </div>
            <button
              id="clear-demo-data-btn"
              onClick={onClearDemoData}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Clear Demo Data
            </button>
          </div>
        ) : (
          <div className="pt-2 flex items-center gap-3">
            <button
              id="load-demo-data-btn"
              onClick={onLoadDemoData}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Demo Data
            </button>
            <span className="text-xs text-slate-400">
              Populates sample medicines with critical & normal FEFO batches for testing.
            </span>
          </div>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Data Backup & Portability
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export your medicine catalog, suppliers, and batch history to local JSON, or restore from a previous backup.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export Database (JSON)
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Database (JSON)
          </button>
        </div>
      </div>

      {/* Danger Zone: Clear All */}
      <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rose-950 dark:text-rose-200">
              Reset Entire Inventory
            </h3>
            <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-0.5">
              Permanently wipes all medicines, batches, suppliers, sales bills, and dispensing history for this vault.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            id="reset-all-data-btn"
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to completely erase all pharmacy records? This cannot be undone.'
                )
              ) {
                onClearAllData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
