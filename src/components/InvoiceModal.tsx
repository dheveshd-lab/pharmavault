import React from 'react';
import { X, Printer, Download, CheckCircle2, AlertCircle, Building2, Phone, Mail } from 'lucide-react';
import { SalesBill, UserProfile } from '../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: SalesBill | null;
  profile?: UserProfile | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  bill,
  profile,
}) => {
  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'GBP' ? '£' : '₹';
  const pharmacyName = profile?.pharmacyName || 'PharmaVault Healthcare';
  const licenseNumber = profile?.licenseNumber || 'DL-PH-984210/2026';
  const phone = profile?.phone || '+91 (0) 44-2834-0192';

  const outstanding = Math.max(0, bill.grandTotal - bill.amountPaid);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:text-black">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Tax Invoice #{bill.billNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                bill.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : bill.paymentStatus === 'Partially Paid'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {bill.paymentStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 space-y-6 print:p-6 print:text-black" id="printable-invoice">
          {/* Pharmacy & Bill Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:border-slate-300">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">
                {pharmacyName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mt-1">
                Drug License No: <span className="font-mono font-medium">{licenseNumber}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                Helpline: {phone}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 print:bg-slate-100 print:text-black font-semibold">
                FEFO Batch Monitored Dispensary
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                Official Retail Bill
              </span>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-white print:text-black">
                {bill.billNumber}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                Date: {new Date(bill.billDate).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                Mode: <span className="font-semibold">{bill.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 print:bg-slate-50 print:border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Billed To / Patient
              </span>
              <div className="text-sm font-semibold text-slate-900 dark:text-white print:text-black mt-0.5">
                {bill.customerName || 'Walk-in Retail Customer'}
              </div>
              {bill.customerPhone && (
                <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                  Phone: {bill.customerPhone}
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Payment Status
              </span>
              <div className="text-sm font-bold text-teal-600 dark:text-teal-400 print:text-teal-800 mt-0.5">
                {bill.paymentStatus}
              </div>
              {outstanding > 0 && (
                <div className="text-xs text-rose-500 font-semibold mt-0.5">
                  Balance Due: {currencySymbol}{outstanding.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Medicine Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold print:border-slate-300">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Medicine / Strength</th>
                  <th className="py-2.5 px-2">Batch (FEFO)</th>
                  <th className="py-2.5 px-2">Expiry</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-200">
                {bill.items.map((item, idx) => (
                  <tr key={item.id} className="text-slate-700 dark:text-slate-300 print:text-black">
                    <td className="py-3 px-2 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-2 font-medium">
                      {item.medicineNameSnapshot}
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-teal-600 dark:text-teal-400 print:text-black">
                      {item.batchNumberSnapshot}
                    </td>
                    <td className="py-3 px-2 text-slate-500 print:text-black">
                      {item.expiryDateSnapshot}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {currencySymbol}{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold">
                      {currencySymbol}{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Tax Calculation Breakdown */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row justify-between gap-6 print:border-slate-300">
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 max-w-sm print:text-slate-600">
              <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                Terms & Dispensing Conditions:
              </p>
              <p className="text-[11px] leading-relaxed">
                1. Medicines dispensed according to First-Expiry First-Out (FEFO) standard.
              </p>
              <p className="text-[11px] leading-relaxed">
                2. Store medicines under temperature guidelines indicated on the package.
              </p>
              {bill.notes && (
                <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400 print:text-black mt-2">
                  Special Instructions: {bill.notes}
                </p>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                <span>Subtotal</span>
                <span>{currencySymbol}{bill.subtotal.toFixed(2)}</span>
              </div>

              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                  <span>Discount</span>
                  <span>-{currencySymbol}{bill.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {bill.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                  <span>GST / Tax ({bill.taxRatePercent}%)</span>
                  <span>+{currencySymbol}{bill.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white print:text-black print:border-slate-300">
                <span>Grand Total</span>
                <span>{currencySymbol}{bill.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                <span>Amount Paid</span>
                <span>{currencySymbol}{bill.amountPaid.toFixed(2)}</span>
              </div>

              {outstanding > 0 ? (
                <div className="flex justify-between text-xs font-bold text-rose-600 print:text-rose-800">
                  <span>Balance Outstanding</span>
                  <span>{currencySymbol}{outstanding.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-800 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fully Paid & Settled</span>
                </div>
              )}
            </div>
          </div>

          {/* Signature & Validation Footer */}
          <div className="pt-8 flex justify-between items-end text-xs text-slate-400 print:text-slate-600">
            <div>
              <p className="text-[10px]">Generated via PharmaVault Clinical Dispensary</p>
              <p className="text-[9px] font-mono">{new Date().toISOString()}</p>
            </div>

            <div className="text-center w-48 border-t border-slate-300 dark:border-slate-700 pt-2 print:border-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300 print:text-black text-xs block">
                Registered Pharmacist
              </span>
              <span className="text-[10px] text-slate-400">Authorized Signature & Seal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
