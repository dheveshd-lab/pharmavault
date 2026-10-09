import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  CreditCard,
  DollarSign,
  TrendingUp,
  FileText,
  RotateCcw,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Batch, Medicine, PaymentMethod, PaymentStatus, SalesBill, SalesBillItem, UserProfile } from '../types';
import { calculateFEFOAllocation, getDaysUntil, getMedicineInventory } from '../utils/fefo';
import { InvoiceModal } from './InvoiceModal';

interface BillingViewProps {
  medicines: Medicine[];
  batches: Batch[];
  salesBills: SalesBill[];
  profile?: UserProfile | null;
  onSaveBill: (bill: SalesBill) => Promise<boolean>;
  onRefundBill?: (bill: SalesBill, restoreStock: boolean) => Promise<boolean>;
  onUpdatePayment?: (billId: string, amount: number, method: PaymentMethod) => Promise<boolean>;
  onOpenAddMedicine: () => void;
  onOpenAddBatch: (medicineId?: string) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  medicines = [],
  batches = [],
  salesBills = [],
  profile,
  onSaveBill,
  onRefundBill,
  onUpdatePayment,
  onOpenAddMedicine,
  onOpenAddBatch,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Currency & Tax settings
  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'GBP' ? '£' : '₹';
  const defaultTaxRate = profile?.taxRatePercent ?? 12.0;

  // Selected bill for print modal
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<SalesBill | null>(null);

  // ---------------------------------------------------------------------------
  // CREATE BILL FORM STATE
  // ---------------------------------------------------------------------------
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(defaultTaxRate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Line item draft builder
  interface DraftLineItem {
    medicineId: string;
    quantity: number;
    unitPrice: number;
  }

  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [draftMedId, setDraftMedId] = useState<string>('');
  const [draftQty, setDraftQty] = useState<number>(1);
  const [draftPrice, setDraftPrice] = useState<number>(0);

  // Available medicines with in-stock batches
  const availableMedicines = useMemo(() => {
    return medicines.map((m) => {
      const inv = getMedicineInventory(m.id, batches);
      return { medicine: m, availableUnits: inv.availableUnits };
    });
  }, [medicines, batches]);

  // Handle medicine select for draft item
  const handleSelectDraftMedicine = (medId: string) => {
    setDraftMedId(medId);
    const validBatches = batches.filter(
      (b) => b.medicineId === medId && b.quantity > 0 && getDaysUntil(b.expiryDate) >= 0
    );
    // Suggest price from earliest batch or first batch
    const price = validBatches[0]?.sellingPrice || validBatches[0]?.purchasePrice || 10;
    setDraftPrice(price);
    setDraftQty(1);
  };

  const handleAddLineItem = () => {
    if (!draftMedId) {
      setFormError('Please select a medicine.');
      return;
    }
    if (draftQty <= 0) {
      setFormError('Quantity must be greater than zero.');
      return;
    }

    const inv = getMedicineInventory(draftMedId, batches);
    // Check if already in lineItems
    const existingTotal = lineItems
      .filter((i) => i.medicineId === draftMedId)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (existingTotal + draftQty > inv.availableUnits) {
      setFormError(
        `Insufficient stock! Only ${inv.availableUnits} eligible units available in FEFO queue (already added: ${existingTotal}).`
      );
      return;
    }

    setFormError(null);
    setLineItems((prev) => [
      ...prev,
      { medicineId: draftMedId, quantity: draftQty, unitPrice: draftPrice },
    ]);
    setDraftMedId('');
    setDraftQty(1);
    setDraftPrice(0);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    return lineItems.map((item, idx) => {
      const med = medicines.find((m) => m.id === item.medicineId);
      const fefoResult = calculateFEFOAllocation(item.quantity, item.medicineId, batches);
      const lineTotal = item.quantity * item.unitPrice;
      return {
        ...item,
        index: idx,
        medicineName: med?.name || 'Unknown',
        fefoResult,
        lineTotal,
      };
    });
  }, [lineItems, medicines, batches]);

  const subtotal = useMemo(() => {
    return calculatedItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  }, [calculatedItems]);

  const discountAmount = useMemo(() => {
    return (subtotal * Math.max(0, discountPercent)) / 100;
  }, [subtotal, discountPercent]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    return (taxableAmount * Math.max(0, taxRatePercent)) / 100;
  }, [taxableAmount, taxRatePercent]);

  const grandTotal = Math.max(0, taxableAmount + taxAmount);

  // Submit bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (lineItems.length === 0) {
      setFormError('Please add at least one medicine item to the invoice.');
      return;
    }

    // Verify all allocations are strictly sufficient
    const allAllocations: SalesBillItem[] = [];
    const billId = `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const billNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    for (const item of lineItems) {
      const med = medicines.find((m) => m.id === item.medicineId);
      const fefo = calculateFEFOAllocation(item.quantity, item.medicineId, batches);
      if (!fefo.isSufficient) {
        setFormError(
          `Insufficient stock for ${med?.name || 'medicine'}. Available: ${fefo.totalAllocated}`
        );
        return;
      }

      for (const alloc of fefo.allocations) {
        const itemLineTotal = alloc.quantity * item.unitPrice;
        allAllocations.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          billId,
          medicineId: item.medicineId,
          batchId: alloc.batchId,
          medicineNameSnapshot: med?.name || 'Medicine',
          batchNumberSnapshot: alloc.batchNumber,
          expiryDateSnapshot: alloc.expiryDate,
          quantity: alloc.quantity,
          unitPrice: item.unitPrice,
          discountAmount: 0,
          taxAmount: 0,
          lineTotal: itemLineTotal,
        });
      }
    }

    const amountPaid = amountPaidInput !== '' ? parseFloat(amountPaidInput) : grandTotal;
    const paymentStatus: PaymentStatus =
      amountPaid >= grandTotal
        ? 'Paid'
        : amountPaid > 0
        ? 'Partially Paid'
        : 'Unpaid';

    const newBill: SalesBill = {
      id: billId,
      billNumber,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      billDate: billDate || new Date().toISOString(),
      items: allAllocations,
      subtotal,
      discountAmount,
      taxAmount,
      taxRatePercent,
      grandTotal,
      amountPaid,
      paymentStatus,
      paymentMethod,
      notes: notes.trim() || undefined,
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    const success = await onSaveBill(newBill);
    setIsSubmitting(false);

    if (success) {
      // Reset form
      setLineItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscountPercent(0);
      setAmountPaidInput('');
      setNotes('');
      // Offer invoice preview
      setSelectedBillForPrint(newBill);
    } else {
      setFormError('Failed to record sales bill. Please verify stock availability.');
    }
  };

  // ---------------------------------------------------------------------------
  // BILLING DASHBOARD METRICS
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let todaySales = 0;
    let monthlySales = 0;
    let totalSales = 0;
    let outstanding = 0;
    const medSalesMap = new Map<string, { name: string; units: number; revenue: number }>();

    for (const b of salesBills) {
      if (b.status === 'Cancelled' || b.status === 'Refunded') continue;

      totalSales += b.grandTotal;
      const bDateStr = b.billDate.split('T')[0];
      if (bDateStr === todayStr) {
        todaySales += b.grandTotal;
      }

      // Check current month
      const bDate = new Date(b.billDate);
      const now = new Date();
      if (bDate.getFullYear() === now.getFullYear() && bDate.getMonth() === now.getMonth()) {
        monthlySales += b.grandTotal;
      }

      if (b.grandTotal > b.amountPaid) {
        outstanding += b.grandTotal - b.amountPaid;
      }

      for (const item of b.items) {
        const curr = medSalesMap.get(item.medicineId) || {
          name: item.medicineNameSnapshot,
          units: 0,
          revenue: 0,
        };
        curr.units += item.quantity;
        curr.revenue += item.lineTotal;
        medSalesMap.set(item.medicineId, curr);
      }
    }

    const topSelling = Array.from(medSalesMap.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 4);

    const activeBillsCount = salesBills.filter((b) => b.status === 'Completed').length;
    const avgOrderValue = activeBillsCount > 0 ? totalSales / activeBillsCount : 0;

    return {
      todaySales,
      monthlySales,
      totalSales,
      outstanding,
      billsCount: activeBillsCount,
      avgOrderValue,
      topSelling,
    };
  }, [salesBills]);

  // ---------------------------------------------------------------------------
  // HISTORY SEARCH & FILTER
  // ---------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredBills = useMemo(() => {
    return salesBills.filter((b) => {
      const matchSearch =
        b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customerPhone || '').includes(searchTerm);

      const matchStatus = statusFilter === 'ALL' || b.paymentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [salesBills, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (salesBills.length === 0) return;
    const headers = [
      'Bill Number',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Payment Method',
      'Subtotal',
      'Discount',
      'Tax',
      'Grand Total',
      'Amount Paid',
      'Payment Status',
      'Status',
    ];

    const rows = salesBills.map((b) => [
      b.billNumber,
      new Date(b.billDate).toLocaleString(),
      `"${b.customerName || 'Walk-in'}"`,
      `"${b.customerPhone || ''}"`,
      b.paymentMethod,
      b.subtotal.toFixed(2),
      b.discountAmount.toFixed(2),
      b.taxAmount.toFixed(2),
      b.grandTotal.toFixed(2),
      b.amountPaid.toFixed(2),
      b.paymentStatus,
      b.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmavault_sales_bills_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Printable Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(selectedBillForPrint)}
        onClose={() => setSelectedBillForPrint(null)}
        bill={selectedBillForPrint}
        profile={profile}
      />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Billing & Sales Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Point-of-Sale with automatic FEFO batch allocation, GST calculation, and printable tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              + Create Bill
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sales History ({salesBills.length})
            </button>
          </div>
        </div>
      </div>

      {/* Sales Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Today's Sales
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {currencySymbol}{metrics.todaySales.toFixed(2)}
          </div>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Real-time settlements</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            This Month
          </span>
          <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
            {currencySymbol}{metrics.monthlySales.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Cumulative gross</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Invoices Issued
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.billsCount}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Completed retail sales</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Avg Order Value
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {currencySymbol}{metrics.avgOrderValue.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Per invoice transaction</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Outstanding Due
          </span>
          <div className={`text-xl font-bold mt-1 ${metrics.outstanding > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {currencySymbol}{metrics.outstanding.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Pending credit balances</span>
        </div>
      </div>

      {/* CREATE BILL TAB */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form & Item Builder (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-teal-600" />
                Customer & Invoice Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Patient Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Medicine Line Items Builder */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" />
                  Add Medicines (FEFO Auto-Allocation)
                </h2>
                <span className="text-xs text-slate-400">
                  {lineItems.length} items added
                </span>
              </div>

              {/* Input Row */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Select Medicine
                    </label>
                    <select
                      value={draftMedId}
                      onChange={(e) => handleSelectDraftMedicine(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="">-- Choose Medicine from Stock --</option>
                      {availableMedicines.map(({ medicine, availableUnits }) => (
                        <option
                          key={medicine.id}
                          value={medicine.id}
                          disabled={availableUnits <= 0}
                        >
                          {medicine.name} ({medicine.dosageForm}) — {availableUnits} in stock
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={draftQty}
                      onChange={(e) => setDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Unit Price ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>

                {/* FEFO Live Allocation Preview for draft medicine */}
                {draftMedId && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      FEFO Sequence:
                    </span>
                    <span>
                      {(() => {
                        const fefo = calculateFEFOAllocation(draftQty, draftMedId, batches);
                        if (!fefo.isSufficient) {
                          return `⚠️ Not enough non-expired units! Only ${fefo.totalAllocated} available.`;
                        }
                        return fefo.allocations
                          .map((a) => `Batch ${a.batchNumber} (${a.quantity} units, exp: ${a.expiryDate})`)
                          .join(' → ');
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {/* Added Line Items Table */}
              {lineItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No medicines added to this invoice yet. Select a medicine and click "Add Item".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                        <th className="py-2.5 px-2">Medicine</th>
                        <th className="py-2.5 px-2">FEFO Allocations</th>
                        <th className="py-2.5 px-2 text-right">Qty</th>
                        <th className="py-2.5 px-2 text-right">Unit Price</th>
                        <th className="py-2.5 px-2 text-right">Total</th>
                        <th className="py-2.5 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {calculatedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">
                            {item.medicineName}
                          </td>
                          <td className="py-2.5 px-2 text-[11px] text-slate-500">
                            {item.fefoResult.allocations.map((a) => (
                              <span
                                key={a.batchId}
                                className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-[10px]"
                              >
                                {a.batchNumber}: {a.quantity}u ({a.expiryDate})
                              </span>
                            ))}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-400">
                            {currencySymbol}{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                            {currencySymbol}{item.lineTotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calculations & Payment Settlement (1 col) */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Payment & Invoice Summary
              </h2>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tax & Discount Inputs */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax ({taxRatePercent}%)</span>
                    <span>+{currencySymbol}{taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="text-teal-600 dark:text-teal-400">
                    {currencySymbol}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Cash">Cash Settlement</option>
                    <option value="UPI">UPI / Digital QR</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Net Banking">Net Banking / Hospital Credit</option>
                    <option value="Other">Other / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder={`Full amount: ${grandTotal.toFixed(2)}`}
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Leave blank to mark as 100% paid ({currencySymbol}{grandTotal.toFixed(2)})
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Special Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., Take with meals, bedtime dose..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting || lineItems.length === 0}
                onClick={handleCreateBill}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-md shadow-teal-900/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Recording Sale & Deducting Stock...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Sale & Generate Tax Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALES HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Controls: Search, Status filter, Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoice number, customer..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid / Due</option>
                <option value="Refunded">Refunded / Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={salesBills.length === 0}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* History Table */}
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Sales Invoices Found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No past billing records match your filters. Create your first retail bill to start tracking sales.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {bill.billNumber}
                          {bill.status === 'Cancelled' && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(bill.billDate).toLocaleDateString()} {new Date(bill.billDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {bill.customerName || 'Walk-in'}
                          {bill.customerPhone && (
                            <span className="block text-[10px] text-slate-400">
                              {bill.customerPhone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {bill.items.length} medicines
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {currencySymbol}{bill.grandTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                          {currencySymbol}{bill.amountPaid.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              bill.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : bill.paymentStatus === 'Partially Paid'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {bill.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedBillForPrint(bill)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Print Invoice"
                            >
                              <Printer className="w-3 h-3 text-teal-600" />
                              Print
                            </button>

                            {bill.status === 'Completed' && onRefundBill && (
                              <button
                                onClick={() => {
                                  if (confirm(`Cancel and refund Invoice ${bill.billNumber}? Do you also want to restore batch stock?`)) {
                                    onRefundBill(bill, true);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Refund / Cancel Invoice"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
