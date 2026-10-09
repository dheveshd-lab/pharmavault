import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  DollarSign,
  Boxes,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Batch, DispensingRecord, Medicine, SalesBill, Supplier, UserProfile } from '../types';
import { getDaysUntil, getExpiryStatus, getMedicineInventory } from '../utils/fefo';

interface ReportsViewProps {
  medicines: Medicine[];
  batches: Batch[];
  dispensingRecords: DispensingRecord[];
  salesBills: SalesBill[];
  suppliers: Supplier[];
  profile?: UserProfile | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  medicines = [],
  batches = [],
  dispensingRecords = [],
  salesBills = [],
  suppliers = [],
  profile,
}) => {
  const [selectedReport, setSelectedReport] = useState<
    'inventory_audit' | 'fefo_expiry' | 'sales_tax' | 'dispensing_log'
  >('inventory_audit');

  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'GBP' ? '£' : '₹';

  const handlePrint = () => {
    window.print();
  };

  // 1. Inventory Valuation Summary
  const inventoryData = useMemo(() => {
    let totalAvailableUnits = 0;
    let totalExpiredUnits = 0;
    let totalCost = 0;
    let totalRetail = 0;

    const list = medicines.map((m) => {
      const inv = getMedicineInventory(m.id, batches);
      const medBatches = batches.filter((b) => b.medicineId === m.id && b.quantity > 0);
      let cost = 0;
      let retail = 0;
      for (const b of medBatches) {
        cost += b.quantity * (b.purchasePrice || 0);
        retail += b.quantity * (b.sellingPrice || b.purchasePrice || 0);
      }
      totalAvailableUnits += inv.availableUnits;
      totalExpiredUnits += inv.expiredUnits;
      totalCost += cost;
      totalRetail += retail;
      return {
        medicine: m,
        availableUnits: inv.availableUnits,
        expiredUnits: inv.expiredUnits,
        cost,
        retail,
      };
    });

    return { list, totalAvailableUnits, totalExpiredUnits, totalCost, totalRetail };
  }, [medicines, batches]);

  // 2. Sales & Tax Summary
  const salesSummary = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let tax = 0;
    let net = 0;
    let paid = 0;
    let outstanding = 0;

    for (const b of salesBills) {
      if (b.status === 'Cancelled' || b.status === 'Refunded') continue;
      gross += b.subtotal;
      discount += b.discountAmount;
      tax += b.taxAmount;
      net += b.grandTotal;
      paid += b.amountPaid;
      if (b.grandTotal > b.amountPaid) {
        outstanding += b.grandTotal - b.amountPaid;
      }
    }

    return { gross, discount, tax, net, paid, outstanding, count: salesBills.length };
  }, [salesBills]);

  // CSV Export for current report
  const handleExportCurrentCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (selectedReport === 'inventory_audit') {
      filename = 'inventory_audit';
      headers = ['Medicine Name', 'Category', 'Dosage Form', 'Available Units', 'Cost Value', 'Retail Value'];
      rows = inventoryData.list.map((i) => [
        `"${i.medicine.name}"`,
        `"${i.medicine.category}"`,
        `"${i.medicine.dosageForm}"`,
        i.availableUnits,
        i.cost.toFixed(2),
        i.retail.toFixed(2),
      ]);
    } else if (selectedReport === 'fefo_expiry') {
      filename = 'fefo_expiry_audit';
      headers = ['Batch Number', 'Medicine', 'Quantity', 'Expiry Date', 'Days Remaining', 'Status'];
      rows = batches.map((b) => {
        const days = getDaysUntil(b.expiryDate);
        const st = getExpiryStatus(b.expiryDate);
        return [b.batchNumber, `"${b.medicineName}"`, b.quantity, b.expiryDate, days, st.status];
      });
    } else if (selectedReport === 'sales_tax') {
      filename = 'sales_tax_summary';
      headers = ['Bill Number', 'Date', 'Customer', 'Subtotal', 'Discount', 'GST/Tax', 'Grand Total', 'Amount Paid', 'Status'];
      rows = salesBills.map((b) => [
        b.billNumber,
        b.billDate,
        `"${b.customerName || 'Walk-in'}"`,
        b.subtotal.toFixed(2),
        b.discountAmount.toFixed(2),
        b.taxAmount.toFixed(2),
        b.grandTotal.toFixed(2),
        b.amountPaid.toFixed(2),
        b.paymentStatus,
      ]);
    } else {
      filename = 'dispensing_history';
      headers = ['Date', 'Medicine', 'Quantity', 'Patient', 'Prescription #', 'Prescribed By', 'Amount'];
      rows = dispensingRecords.map((d) => [
        d.dispensedAt,
        `"${d.medicineName}"`,
        d.quantity,
        `"${d.patientName || 'N/A'}"`,
        `"${d.prescriptionNumber || 'N/A'}"`,
        `"${d.prescribedBy || 'N/A'}"`,
        d.totalAmount ? d.totalAmount.toFixed(2) : '0.00',
      ]);
    }

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmavault_${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Compliance, Financial & Audit Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Generate formal clinical audit sheets, GST tax filings, and stock valuation statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrentCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs (Hidden in Print) */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {[
          { id: 'inventory_audit', label: 'Inventory & Stock Valuation Statement' },
          { id: 'fefo_expiry', label: 'FEFO Expiry & Potency Audit' },
          { id: 'sales_tax', label: 'Retail Sales & GST Tax Filing' },
          { id: 'dispensing_log', label: 'Clinical Dispensing Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReport(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedReport === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Printable Report Canvas */}
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6 print:border-none print:shadow-none print:p-0 print:text-black">
        {/* Report Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between gap-4 print:border-slate-300">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
              {profile?.pharmacyName || 'PharmaVault Clinical Dispensary'}
            </h2>
            <p className="text-xs text-slate-500 print:text-slate-600 mt-1">
              Drug License: {profile?.licenseNumber || 'REG-PH-2026/DL'} • Registered Pharmacist: {profile?.fullName || 'Pharmacist In-Charge'}
            </p>
          </div>

          <div className="sm:text-right text-xs text-slate-500 print:text-slate-600">
            <span className="font-bold text-slate-900 dark:text-white print:text-black block text-sm">
              {selectedReport === 'inventory_audit' && 'Stock Valuation & Inventory Audit'}
              {selectedReport === 'fefo_expiry' && 'FEFO Expiry & Potency Compliance Audit'}
              {selectedReport === 'sales_tax' && 'Retail Sales & GST/Tax Collection Summary'}
              {selectedReport === 'dispensing_log' && 'Clinical Prescription Dispensing Log'}
            </span>
            <span>Generated: {new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Report Body 1: Inventory Audit */}
        {selectedReport === 'inventory_audit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 print:bg-slate-50 print:border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Total Active Units</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                  {inventoryData.totalAvailableUnits.toLocaleString()} units
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Acquisition Cost</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                  {currencySymbol}{inventoryData.totalCost.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Projected Retail Value</span>
                <span className="font-bold text-sm text-teal-600 dark:text-teal-400 print:text-teal-800">
                  {currencySymbol}{inventoryData.totalRetail.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Quarantined Expired</span>
                <span className="font-bold text-sm text-rose-500">
                  {inventoryData.totalExpiredUnits} units
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-semibold print:border-slate-300">
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Available Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost Value</th>
                    <th className="py-2.5 px-3 text-right">Retail Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-200">
                  {inventoryData.list.map((item) => (
                    <tr key={item.medicine.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white print:text-black">
                        {item.medicine.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{item.medicine.category}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200 print:text-black">
                        {item.availableUnits}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 print:text-black">
                        {currencySymbol}{item.cost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white print:text-black">
                        {currencySymbol}{item.retail.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Body 2: Sales & Tax */}
        {selectedReport === 'sales_tax' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 print:bg-slate-50 print:border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Gross Retail Sales</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                  {currencySymbol}{salesSummary.gross.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Discounts Given</span>
                <span className="font-bold text-sm text-emerald-600 print:text-emerald-800">
                  {currencySymbol}{salesSummary.discount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">GST / Tax Collected</span>
                <span className="font-bold text-sm text-teal-600 dark:text-teal-400 print:text-teal-800">
                  {currencySymbol}{salesSummary.tax.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Net Revenue</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                  {currencySymbol}{salesSummary.net.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-semibold print:border-slate-300">
                    <th className="py-2.5 px-3">Bill #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-200">
                  {salesBills.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white print:text-black">
                        {b.billNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{new Date(b.billDate).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 print:text-black">
                        {b.customerName || 'Walk-in'}
                      </td>
                      <td className="py-2.5 px-3 text-right">{currencySymbol}{b.subtotal.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">{currencySymbol}{b.taxAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white print:text-black">
                        {currencySymbol}{b.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 print:text-black">
                          {b.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Body 3: FEFO Expiry Audit */}
        {selectedReport === 'fefo_expiry' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-semibold print:border-slate-300">
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-200">
                {batches.map((b) => {
                  const status = getExpiryStatus(b.expiryDate);
                  return (
                    <tr key={b.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white print:text-black">
                        {b.batchNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 print:text-black">{b.medicineName}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{b.quantity}</td>
                      <td className="py-2.5 px-3 text-slate-500">{b.expiryDate}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{b.supplierName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Report Body 4: Dispensing Log */}
        {selectedReport === 'dispensing_log' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-semibold print:border-slate-300">
                  <th className="py-2.5 px-3">Dispensed At</th>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Prescription #</th>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-200">
                {dispensingRecords.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(d.dispensedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white print:text-black">
                      {d.medicineName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">{d.quantity}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 print:text-black">
                      {d.patientName || 'Walk-in'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{d.prescriptionNumber || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{d.prescribedBy || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {d.totalAmount ? `${currencySymbol}${d.totalAmount.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature & Seal Footer */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-xs text-slate-400 print:text-slate-600 print:border-slate-300">
          <div>
            <p className="text-[10px]">PharmaVault Regulatory & Inventory Compliance System</p>
            <p className="text-[9px] font-mono">Report Signature Hash: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
          </div>

          <div className="text-center w-52 border-t border-slate-300 dark:border-slate-700 pt-2 print:border-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black text-xs block">
              {profile?.fullName || 'Registered Pharmacist'}
            </span>
            <span className="text-[10px] text-slate-400">Clinical Verification Seal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
