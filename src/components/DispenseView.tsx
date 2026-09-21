import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  FileText,
  User,
  Hash,
  Stethoscope,
  Info,
  CheckCircle2,
  Plus,
  Box,
  Pill,
} from 'lucide-react';
import { Batch, Medicine } from '../types';
import { calculateFEFOAllocation, getExpiryStatus, getMedicineInventory, sortBatchesFEFO } from '../utils/fefo';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from './ErrorBoundary';

interface DispenseViewProps {
  medicines: Medicine[];
  batches: Batch[];
  onDispense: (dispenseData: {
    medicineId: string;
    quantity: number;
    patientName?: string;
    prescriptionNumber?: string;
    prescribedBy?: string;
    notes?: string;
    unitPrice?: number;
    dispensedAt?: string;
  }) => Promise<boolean> | boolean;
  onOpenAddMedicine: () => void;
  onOpenAddBatch?: (medicineId?: string) => void;
  preselectedMedicineId?: string;
  onClearPreselectedMedicine?: () => void;
}

export const DispenseViewContent: React.FC<DispenseViewProps> = ({
  medicines = [],
  batches = [],
  onDispense,
  onOpenAddMedicine,
  onOpenAddBatch,
  preselectedMedicineId,
  onClearPreselectedMedicine,
}) => {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeBatches = Array.isArray(batches) ? batches : [];

  // Determine initial selected medicine
  const [selectedMedId, setSelectedMedId] = useState<string>(() => {
    if (preselectedMedicineId && safeMedicines.some((m) => m && m.id === preselectedMedicineId)) {
      return preselectedMedicineId;
    }
    // Pick the first medicine that has available stock if possible, otherwise first medicine
    const medWithStock = safeMedicines.find((m) => {
      if (!m) return false;
      const inv = getMedicineInventory(m.id, safeBatches);
      return inv.availableUnits > 0;
    });
    return medWithStock ? medWithStock.id : safeMedicines[0]?.id || '';
  });

  // Keep selected medicine updated if preselectedMedicineId changes or current is invalid
  useEffect(() => {
    if (preselectedMedicineId && safeMedicines.some((m) => m && m.id === preselectedMedicineId)) {
      setSelectedMedId(preselectedMedicineId);
    } else if (selectedMedId && !safeMedicines.some((m) => m && m.id === selectedMedId)) {
      setSelectedMedId(safeMedicines[0]?.id || '');
    }
  }, [preselectedMedicineId, safeMedicines, selectedMedId]);

  const [quantity, setQuantity] = useState<string>('1');
  const [patientName, setPatientName] = useState<string>('');
  const [prescriptionNumber, setPrescriptionNumber] = useState<string>('');
  const [prescribedBy, setPrescribedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [dispenseDate, setDispenseDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current selected medicine & its inventory
  const currentMedicine = useMemo(() => {
    if (!selectedMedId || safeMedicines.length === 0) return null;
    return safeMedicines.find((m) => m && m.id === selectedMedId) || null;
  }, [safeMedicines, selectedMedId]);

  const inventory = useMemo(() => {
    if (!currentMedicine) {
      return {
        totalUnits: 0,
        availableUnits: 0,
        expiredUnits: 0,
        activeBatchesCount: 0,
        expiredBatchesCount: 0,
        nearExpiryBatchesCount: 0,
        earliestExpiryDate: undefined,
      };
    }
    return getMedicineInventory(currentMedicine.id, safeBatches);
  }, [currentMedicine, safeBatches]);

  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0);

  // Compute FEFO allocation live
  const fefoResult = useMemo(() => {
    if (!selectedMedId || parsedQty <= 0) return null;
    return calculateFEFOAllocation(parsedQty, selectedMedId, safeBatches, false);
  }, [selectedMedId, parsedQty, safeBatches]);

  // All batches for current medicine
  const currentMedBatches = useMemo(() => {
    if (!selectedMedId) return [];
    const matched = safeBatches.filter((b) => b && b.medicineId === selectedMedId);
    return sortBatchesFEFO(matched);
  }, [selectedMedId, safeBatches]);

  const canDispense =
    Boolean(currentMedicine) &&
    parsedQty > 0 &&
    Boolean(fefoResult && fefoResult.isSufficient && fefoResult.allocations && fefoResult.allocations.length > 0) &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentMedicine) {
      setErrorMessage('Please select a valid medicine to dispense.');
      return;
    }

    if (parsedQty <= 0) {
      setErrorMessage('Please enter a valid quantity greater than 0.');
      return;
    }

    if (!fefoResult || !fefoResult.isSufficient) {
      setErrorMessage(
        `Unable to process dispensing. Insufficient unexpired stock available (Requested: ${parsedQty}, Available: ${inventory.availableUnits}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onDispense({
        medicineId: currentMedicine.id,
        quantity: parsedQty,
        patientName: patientName.trim() || undefined,
        prescriptionNumber: prescriptionNumber.trim() || undefined,
        prescribedBy: prescribedBy.trim() || undefined,
        notes: notes.trim() || undefined,
        dispensedAt: dispenseDate ? new Date(dispenseDate).toISOString() : new Date().toISOString(),
      });

      if (success) {
        // Reset form for next dispensing
        setQuantity('1');
        setPatientName('');
        setPrescriptionNumber('');
        setPrescribedBy('');
        setNotes('');
        setErrorMessage(null);
        if (onClearPreselectedMedicine) {
          onClearPreselectedMedicine();
        }
      } else {
        setErrorMessage('Unable to process dispensing. Please check stock and try again.');
      }
    } catch (err: any) {
      console.error('Error in handleSubmit dispensing:', err);
      setErrorMessage(err?.message || 'Unable to process dispensing. Please check stock and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. If no medicines exist in the entire inventory
  if (safeMedicines.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dispense Medicine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            First-Expired, First-Out (FEFO) automated batch allocation and dispensing engine.
          </p>
        </div>

        <EmptyState
          type="medicines"
          onAction={onOpenAddMedicine}
          customTitle="No medicines available for dispensing."
          customDescription="Start by adding your first medicine and receiving inventory batches to begin dispensing."
          actionLabel="+ Add Medicine"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Dispense Medicine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> FEFO Guard Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dispenses from earliest-expiring non-expired batches first to guarantee zero wastage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddBatch && currentMedicine && (
            <button
              id="dispense-view-add-batch-btn"
              type="button"
              onClick={() => onOpenAddBatch(currentMedicine.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Batch to Medicine
            </button>
          )}

          <button
            id="dispense-view-add-medicine-btn"
            type="button"
            onClick={onOpenAddMedicine}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Medicine
          </button>
        </div>
      </div>

      {/* Main Dispense Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Column: Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5"
          >
            {/* Error Notification Banner */}
            {errorMessage && (
              <div
                id="dispense-error-banner"
                className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">Dispensing Error</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* 1. Medicine Selection */}
            <div>
              <label
                htmlFor="dispense-medicine-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Select Medicine to Dispense *
              </label>
              <select
                id="dispense-medicine-select"
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
                required
              >
                {safeMedicines.map((m) => {
                  if (!m) return null;
                  const inv = getMedicineInventory(m.id, safeBatches);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosageForm || 'Unit'}) {m.strength ? `• ${m.strength}` : ''} — {inv.availableUnits} {m.unit || 'units'} available
                      {inv.availableUnits === 0 ? ' [OUT OF STOCK]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Medicine Inventory Overview Card */}
            {currentMedicine ? (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      {currentMedicine.name}
                    </h3>
                    {currentMedicine.genericName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Generic: <span className="font-medium">{currentMedicine.genericName}</span>
                      </p>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {currentMedicine.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-750 text-center">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      Available Stock
                    </span>
                    <span
                      className={`text-base font-bold ${
                        inventory.availableUnits === 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : inventory.availableUnits <= currentMedicine.minStockLevel
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {inventory.availableUnits} <span className="text-xs font-normal">{currentMedicine.unit || 'units'}</span>
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      Active Batches
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {inventory.activeBatchesCount}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                      Min Safety Level
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {currentMedicine.minStockLevel}
                    </span>
                  </div>
                </div>

                {inventory.expiredUnits > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {inventory.expiredUnits} units in expired batches are automatically excluded from dispensing.
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* 2. Quantity Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="dispense-quantity-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Quantity to Dispense *
                </label>
                {inventory.availableUnits > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(String(inventory.availableUnits))}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                  >
                    Max ({inventory.availableUnits} {currentMedicine?.unit || 'units'})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => String(Math.max(1, (parseInt(prev, 10) || 0) - 1)))}
                  className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-lg cursor-pointer transition-colors"
                >
                  -
                </button>
                <input
                  id="dispense-quantity-input"
                  type="number"
                  min="1"
                  max={inventory.availableUnits > 0 ? inventory.availableUnits : undefined}
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-center text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((prev) =>
                      String(
                        inventory.availableUnits > 0
                          ? Math.min(inventory.availableUnits, (parseInt(prev, 10) || 0) + 1)
                          : (parseInt(prev, 10) || 0) + 1
                      )
                    )
                  }
                  className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-lg cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>

              {/* Insufficient Stock Alert */}
              {fefoResult && !fefoResult.isSufficient && (
                <div
                  id="insufficient-stock-alert"
                  className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Insufficient Stock</span>
                    <span>
                      You requested {parsedQty} units, but only {fefoResult.totalAvailable} units are available in valid non-expired batches. Shortfall: {fefoResult.shortfall} units.
                    </span>
                  </div>
                </div>
              )}

              {inventory.availableUnits === 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Out of Stock</span>
                    <span>This medicine has no active unexpired batches in inventory. Please receive a batch first.</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Live FEFO Allocation Breakdown */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  FEFO Batch Allocation Breakdown
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Calculated automatically
                </span>
              </div>

              {fefoResult && fefoResult.allocations.length > 0 ? (
                <div className="space-y-2">
                  {fefoResult.allocations.map((alloc, idx) => {
                    const status = getExpiryStatus(alloc.expiryDate);
                    return (
                      <div
                        key={alloc.batchId || idx}
                        className="p-3 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              Batch: {alloc.batchNumber}
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Exp: {alloc.expiryDate}</span>
                              <span className={`px-1.5 py-0.2 rounded-md font-semibold text-[9px] border ${status.badgeClass}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-sm text-teal-700 dark:text-teal-300">
                            -{alloc.quantity}
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                            {currentMedicine?.unit || 'units'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>Total units to deduct via FEFO:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {fefoResult.totalAllocated} {currentMedicine?.unit || 'units'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-center text-xs text-slate-500">
                  {inventory.availableUnits > 0
                    ? 'Enter a valid quantity to view the First-Expired First-Out batch sequence.'
                    : 'No valid unexpired batches available to allocate.'}
                </div>
              )}
            </div>

            {/* 4. Dispense Date / Time */}
            <div>
              <label
                htmlFor="dispense-date-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Dispense Date & Time
              </label>
              <input
                id="dispense-date-input"
                type="datetime-local"
                value={dispenseDate}
                onChange={(e) => setDispenseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* 5. Patient & Prescription Information (Optional) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Patient & Prescription Details (Optional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="dispense-patient-name"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Patient Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="dispense-patient-name"
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dispense-prescription-number"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Prescription / Reference #
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="dispense-prescription-number"
                      type="text"
                      value={prescriptionNumber}
                      onChange={(e) => setPrescriptionNumber(e.target.value)}
                      placeholder="e.g. RX-2026-8941"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dispense-prescribed-by"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Prescribed By (Physician)
                  </label>
                  <div className="relative">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="dispense-prescribed-by"
                      type="text"
                      value={prescribedBy}
                      onChange={(e) => setPrescribedBy(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dispense-notes"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Dosage Notes / Instructions
                  </label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="dispense-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Take 1 tablet twice daily"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit & Reset Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuantity('1');
                  setPatientName('');
                  setPrescriptionNumber('');
                  setPrescribedBy('');
                  setNotes('');
                  setErrorMessage(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Clear Form
              </button>

              <button
                id="submit-dispense-btn"
                type="submit"
                disabled={!canDispense}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer ${
                  canDispense
                    ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-teal-700/20'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Recording Dispense...' : 'Confirm & Dispense (FEFO)'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Medicine Batches & FEFO Rules Overview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Batches in FEFO Sequence */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Current Batches for this Medicine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sorted by FEFO (earliest expiry first)
                </p>
              </div>

              {onOpenAddBatch && currentMedicine && (
                <button
                  type="button"
                  onClick={() => onOpenAddBatch(currentMedicine.id)}
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  + Add Batch
                </button>
              )}
            </div>

            {currentMedBatches.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <Box className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No batches received for this medicine yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Add an inventory batch with expiry date to enable dispensing.
                </p>
                {onOpenAddBatch && currentMedicine && (
                  <button
                    type="button"
                    onClick={() => onOpenAddBatch(currentMedicine.id)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Receive First Batch
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {currentMedBatches.map((b, idx) => {
                  const status = getExpiryStatus(b.expiryDate);
                  const isExpired = status.status === 'EXPIRED';
                  const isAllocated = fefoResult?.allocations.some((a) => a.batchId === b.id);
                  const allocatedQty =
                    fefoResult?.allocations.find((a) => a.batchId === b.id)?.quantity || 0;

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border transition-all text-xs ${
                        isAllocated
                          ? 'border-teal-400 bg-teal-50/50 dark:border-teal-700 dark:bg-teal-950/30 ring-1 ring-teal-400/40'
                          : isExpired
                          ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20 opacity-70'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              Batch: {b.batchNumber}
                            </span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                              Supplier: {b.supplierName || 'Direct'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-bold text-sm ${
                              b.quantity === 0
                                ? 'text-slate-400'
                                : isExpired
                                ? 'text-rose-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {b.quantity} {currentMedicine?.unit || 'units'}
                          </span>
                          <span className={`block text-[9px] px-1.5 py-0.2 rounded-md font-semibold border ${status.badgeClass} mt-0.5`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {isAllocated && (
                        <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-900/60 flex items-center justify-between text-[11px] text-teal-800 dark:text-teal-200 font-medium">
                          <span>Allocated in current request:</span>
                          <span className="font-bold">
                            -{allocatedQty} units (Remaining: {b.quantity - allocatedQty})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FEFO Principles Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              How First-Expired, First-Out Works
            </h4>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Batches expiring earliest are prioritized first.</li>
              <li>Expired batches are blocked from dispensing automatically.</li>
              <li>Multi-batch allocation is seamlessly triggered when requested quantity exceeds a single batch.</li>
              <li>Each transaction logs batch allocations for full audit traceability.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DispenseView: React.FC<DispenseViewProps> = (props) => {
  return (
    <ErrorBoundary fallbackMessage="Unable to process dispensing. Please check stock and try again.">
      <DispenseViewContent {...props} />
    </ErrorBoundary>
  );
};
