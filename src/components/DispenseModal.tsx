import React, { useState, useMemo, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Batch, DispensingRecord, Medicine } from '../types';
import { calculateFEFOAllocation, getMedicineInventory } from '../utils/fefo';
import { ErrorBoundary } from './ErrorBoundary';

interface DispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispense: (record: DispensingRecord) => void;
  medicines: Medicine[];
  batches: Batch[];
  initialMedicineId?: string;
}

export const DispenseModalContent: React.FC<DispenseModalProps> = ({
  isOpen,
  onClose,
  onDispense,
  medicines = [],
  batches = [],
  initialMedicineId,
}) => {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeBatches = Array.isArray(batches) ? batches : [];

  const [selectedMedId, setSelectedMedId] = useState(() => {
    if (initialMedicineId && safeMedicines.some((m) => m && m.id === initialMedicineId)) {
      return initialMedicineId;
    }
    return safeMedicines.length > 0 ? safeMedicines[0].id : '';
  });

  useEffect(() => {
    if (initialMedicineId && safeMedicines.some((m) => m && m.id === initialMedicineId)) {
      setSelectedMedId(initialMedicineId);
    } else if (safeMedicines.length > 0 && (!selectedMedId || !safeMedicines.some((m) => m && m.id === selectedMedId))) {
      setSelectedMedId(safeMedicines[0].id);
    }
  }, [initialMedicineId, safeMedicines, selectedMedId]);

  const [quantity, setQuantity] = useState('1');
  const [patientName, setPatientName] = useState('');
  const [prescriptionNumber, setPrescriptionNumber] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const currentMedicine = safeMedicines.find((m) => m && m.id === selectedMedId) || null;
  const inventory = currentMedicine
    ? getMedicineInventory(currentMedicine.id, safeBatches)
    : { availableUnits: 0, totalUnits: 0, expiredUnits: 0, activeBatchesCount: 0, expiredBatchesCount: 0, nearExpiryBatchesCount: 0 };

  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0);

  // Compute FEFO allocation live
  const fefoResult = useMemo(() => {
    if (!selectedMedId || parsedQty <= 0) return null;
    return calculateFEFOAllocation(parsedQty, selectedMedId, safeBatches, false);
  }, [selectedMedId, parsedQty, safeBatches]);

  const canDispense =
    Boolean(currentMedicine) &&
    parsedQty > 0 &&
    fefoResult !== null &&
    fefoResult.isSufficient &&
    fefoResult.allocations.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDispense || !currentMedicine || !fefoResult) return;

    // Calculate approximate price if selling price is set on batches
    let totalAmount = 0;
    for (const alloc of fefoResult.allocations) {
      const b = safeBatches.find((item) => item && item.id === alloc.batchId);
      if (b && b.sellingPrice) {
        totalAmount += b.sellingPrice * alloc.quantity;
      }
    }

    const record: DispensingRecord = {
      id: `disp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      medicineId: currentMedicine.id,
      medicineName: currentMedicine.name,
      quantity: parsedQty,
      batchAllocations: fefoResult.allocations,
      patientName: patientName.trim() || undefined,
      prescriptionNumber: prescriptionNumber.trim() || undefined,
      prescribedBy: prescribedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      dispensedAt: new Date().toISOString(),
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
    };

    onDispense(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="dispense-medicine-modal-dialog"
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Dispense Medicine (FEFO Mode)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated First-Expired, First-Out allocation ensures oldest unexpired stock is deducted first.
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
          {/* Medicine Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Medicine *
            </label>
            <select
              id="dispense-medicine-select"
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              {medicines.length === 0 ? (
                <option value="">No medicines added yet</option>
              ) : (
                medicines.map((m) => {
                  const inv = getMedicineInventory(m.id, batches);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosageForm}) — {inv.availableUnits} {m.unit || 'units'} available
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Current Stock Banner */}
          {currentMedicine && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Available Stock:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {inventory.availableUnits} {currentMedicine.unit || 'units'}
                </span>
                {inventory.expiredUnits > 0 && (
                  <span className="text-rose-500 font-medium">
                    ({inventory.expiredUnits} expired units excluded)
                  </span>
                )}
              </div>
              <span className="text-slate-400">
                Min Stock Level: {currentMedicine.minStockLevel}
              </span>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity to Dispense *
            </label>
            <input
              id="dispense-quantity-input"
              type="number"
              min="1"
              max={inventory.availableUnits > 0 ? inventory.availableUnits : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* FEFO Automated Allocation Preview */}
          <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                FEFO Batch Allocation Breakdown:
              </span>
              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                Earliest Expiry First
              </span>
            </div>

            {fefoResult && fefoResult.allocations.length > 0 ? (
              <div className="space-y-1.5">
                {fefoResult.allocations.map((alloc, i) => (
                  <div
                    key={alloc.batchId}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-teal-100 dark:border-teal-900/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Batch {alloc.batchNumber}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        (Exp: {alloc.expiryDate})
                      </span>
                    </div>
                    <span className="font-bold text-teal-700 dark:text-teal-400">
                      Deduct {alloc.quantity} {currentMedicine?.unit || 'units'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {inventory.availableUnits === 0
                  ? 'No available stock or active batches for this medicine.'
                  : 'Enter quantity to calculate batch deduction order.'}
              </p>
            )}

            {fefoResult && !fefoResult.isSufficient && (
              <div className="mt-2.5 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Insufficient stock! You requested {parsedQty} units, but only {fefoResult.totalAvailable} units are available in valid non-expired batches. Shortfall: {fefoResult.shortfall} units.
                </span>
              </div>
            )}
          </div>

          {/* Patient / Prescription metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient Name
              </label>
              <input
                id="dispense-patient-input"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prescription #
              </label>
              <input
                id="dispense-rx-input"
                type="text"
                value={prescriptionNumber}
                onChange={(e) => setPrescriptionNumber(e.target.value)}
                placeholder="e.g. RX-10492"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prescribed By
              </label>
              <input
                id="dispense-doctor-input"
                type="text"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                placeholder="Dr. Name"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dosage Instructions / Dispensing Notes
            </label>
            <input
              id="dispense-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 1 tablet BID after food for 5 days"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
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
              id="confirm-dispense-submit-btn"
              type="submit"
              disabled={!canDispense}
              className={`px-5 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all cursor-pointer ${
                canDispense
                  ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              Confirm Dispensing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DispenseModal: React.FC<DispenseModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <ErrorBoundary fallbackMessage="Unable to process dispensing. Please check stock and try again.">
      <DispenseModalContent {...props} />
    </ErrorBoundary>
  );
};
