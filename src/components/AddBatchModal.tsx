import React, { useState } from 'react';
import { X, Box, AlertCircle, Plus } from 'lucide-react';
import { Batch, Medicine, Supplier } from '../types';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (batch: Batch) => void;
  medicines: Medicine[];
  suppliers: Supplier[];
  selectedMedicineId?: string;
  onRequestAddSupplier?: () => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  medicines,
  suppliers,
  selectedMedicineId,
  onRequestAddSupplier,
}) => {
  const [medicineId, setMedicineId] = useState(
    selectedMedicineId || (medicines.length > 0 ? medicines[0].id : '')
  );
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierId, setSupplierId] = useState(
    suppliers.length > 0 ? suppliers[0].id : ''
  );
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const currentMed = medicines.find((m) => m.id === medicineId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!medicineId) errs.medicineId = 'Please select a medicine.';
    if (!batchNumber.trim()) errs.batchNumber = 'Batch number is required.';
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      errs.quantity = 'Quantity must be greater than 0.';
    }
    if (!expiryDate) {
      errs.expiryDate = 'Expiry date is required for FEFO tracking.';
    }
    if (!supplierId) {
      errs.supplierId = 'Supplier is required. Add a supplier if none exists.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const chosenMed = medicines.find((m) => m.id === medicineId);
    const chosenSup = suppliers.find((s) => s.id === supplierId);
    const qty = parseInt(quantity, 10);

    const newBatch: Batch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      medicineId,
      medicineName: chosenMed?.name || 'Unknown Medicine',
      batchNumber: batchNumber.trim(),
      quantity: qty,
      initialQuantity: qty,
      manufacturingDate: manufacturingDate || undefined,
      expiryDate,
      supplierId,
      supplierName: chosenSup?.name || 'Unknown Supplier',
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
      createdAt: new Date().toISOString(),
    };

    onSave(newBatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="add-batch-modal-dialog"
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                + Add Batch
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log a manufactured batch into FEFO (First-Expired, First-Out) inventory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medicine: Automatically selected if pre-selected, or dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Medicine {selectedMedicineId ? '(Automatically Selected)' : '*'}
            </label>
            {selectedMedicineId && currentMed ? (
              <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {currentMed.name}
                  </span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                    {currentMed.dosageForm} • {currentMed.strength || currentMed.category}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-800">
                  Target Medicine
                </span>
              </div>
            ) : (
              <select
                id="batch-medicine-select"
                value={medicineId}
                onChange={(e) => setMedicineId(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.medicineId
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              >
                {medicines.length === 0 ? (
                  <option value="">No medicines available - add a medicine first</option>
                ) : (
                  medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosageForm} {m.strength ? `- ${m.strength}` : ''})
                    </option>
                  ))
                )}
              </select>
            )}
            {errors.medicineId && <p className="mt-1 text-xs text-rose-500">{errors.medicineId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batch Number * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="batch-number-input"
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g., BN-2026-X90"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.batchNumber
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.batchNumber && (
                <p className="mt-1 text-xs text-rose-500">{errors.batchNumber}</p>
              )}
            </div>

            {/* Quantity * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity (Units) <span className="text-rose-500">*</span>
              </label>
              <input
                id="batch-quantity-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 50"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.quantity
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.quantity && <p className="mt-1 text-xs text-rose-500">{errors.quantity}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manufacturing Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manufacturing Date
              </label>
              <input
                id="batch-mfg-date-input"
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Expiry Date * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="batch-expiry-date-input"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.expiryDate
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.expiryDate ? (
                <p className="mt-1 text-xs text-rose-500">{errors.expiryDate}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Critical for First-Expired, First-Out (FEFO) automated dispensing order.
                </p>
              )}
            </div>
          </div>

          {/* Supplier * */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supplier <span className="text-rose-500">*</span>
              </label>
              {onRequestAddSupplier && (
                <button
                  type="button"
                  onClick={onRequestAddSupplier}
                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add New Supplier
                </button>
              )}
            </div>

            {suppliers.length === 0 ? (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>No suppliers registered yet. Please add a supplier first.</span>
                {onRequestAddSupplier && (
                  <button
                    type="button"
                    onClick={onRequestAddSupplier}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
                  >
                    + Add Supplier
                  </button>
                )}
              </div>
            ) : (
              <select
                id="batch-supplier-select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.supplierId
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Lead time: {s.leadTimeDays}d)
                  </option>
                ))}
              </select>
            )}
            {errors.supplierId && <p className="mt-1 text-xs text-rose-500">{errors.supplierId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Price (Per Unit)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-slate-400">$</span>
                <input
                  id="batch-purchase-price-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price (Per Unit)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-slate-400">$</span>
                <input
                  id="batch-selling-price-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-batch-submit-btn"
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Save Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
