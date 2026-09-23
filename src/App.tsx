/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Pill,
  LayoutDashboard,
  Box,
  Truck,
  ReceiptText,
  Settings,
  Send,
  Plus,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { AppData, Batch, DispensingRecord, Medicine, Supplier } from './types';
import {
  getInitialOrStoredData,
  persistAppData,
  generateDemoDataset,
  INITIAL_EMPTY_DATA,
} from './utils/storage';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AddMedicineModal } from './components/AddMedicineModal';
import { AddBatchModal } from './components/AddBatchModal';
import { AddSupplierModal } from './components/AddSupplierModal';
import { MedicineDetailModal } from './components/MedicineDetailModal';
import { DispenseModal } from './components/DispenseModal';
import { DashboardView } from './components/DashboardView';
import { MedicinesView } from './components/MedicinesView';
import { BatchesView } from './components/BatchesView';
import { SuppliersView } from './components/SuppliersView';
import { DispensingHistoryView } from './components/DispensingHistoryView';
import { DispenseView } from './components/DispenseView';
import { UsageIntelligenceView } from './components/UsageIntelligenceView';
import { SettingsView } from './components/SettingsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { calculateFEFOAllocation } from './utils/fefo';

export default function App() {
  // Inventory database state: loaded directly from storage, initially empty
  const [data, setData] = useState<AppData>(() => getInitialOrStoredData());

  // Automatically persist any data updates to storage
  useEffect(() => {
    persistAppData(data);
  }, [data]);

  // Navigation tab - starts directly at Dashboard
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'medicines' | 'batches' | 'dispense' | 'suppliers' | 'history' | 'usage' | 'settings'
  >('dashboard');

  // Mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (title: string, description?: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Modals state
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [batchTargetMedicineId, setBatchTargetMedicineId] = useState<string | undefined>(undefined);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  const [isDispenseOpen, setIsDispenseOpen] = useState(false);
  const [dispenseTargetMedicineId, setDispenseTargetMedicineId] = useState<string | undefined>(undefined);

  const [viewingMedicine, setViewingMedicine] = useState<Medicine | null>(null);

  // Keep viewingMedicine synced with data updates
  useEffect(() => {
    if (viewingMedicine) {
      const refreshed = data.medicines.find((m) => m.id === viewingMedicine.id);
      setViewingMedicine(refreshed || null);
    }
  }, [data.medicines]);

  // Handlers
  const handleSaveMedicine = (medicine: Medicine) => {
    setData((prev) => {
      const exists = prev.medicines.some((m) => m.id === medicine.id);
      let updatedMedicines: Medicine[];
      if (exists) {
        updatedMedicines = prev.medicines.map((m) => (m.id === medicine.id ? medicine : m));
      } else {
        updatedMedicines = [medicine, ...prev.medicines];
      }
      return { ...prev, medicines: updatedMedicines, isDemoData: false };
    });

    addToast(
      medicine.id && data.medicines.some((m) => m.id === medicine.id)
        ? 'Medicine Updated'
        : 'Medicine Added',
      `${medicine.name} (${medicine.dosageForm}) saved to your catalog.`
    );
  };

  const handleDeleteMedicine = (medicineId: string) => {
    const med = data.medicines.find((m) => m.id === medicineId);
    setData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((m) => m.id !== medicineId),
      batches: prev.batches.filter((b) => b.medicineId !== medicineId),
    }));

    if (viewingMedicine && viewingMedicine.id === medicineId) {
      setViewingMedicine(null);
    }

    addToast(
      'Medicine Deleted',
      `${med?.name || 'Medicine'} and its batches have been removed from your inventory.`,
      'info'
    );
  };

  const handleSaveBatch = (batch: Batch) => {
    setData((prev) => {
      const exists = prev.batches.some((b) => b.id === batch.id);
      let updatedBatches: Batch[];
      if (exists) {
        updatedBatches = prev.batches.map((b) => (b.id === batch.id ? batch : b));
      } else {
        updatedBatches = [batch, ...prev.batches];
      }
      return { ...prev, batches: updatedBatches, isDemoData: false };
    });

    addToast(
      'Batch Registered',
      `Batch ${batch.batchNumber} (${batch.quantity} units) registered for ${batch.medicineName}.`
    );
  };

  const handleDeleteBatch = (batchId: string) => {
    const batch = data.batches.find((b) => b.id === batchId);
    setData((prev) => ({
      ...prev,
      batches: prev.batches.filter((b) => b.id !== batchId),
    }));

    addToast(
      'Batch Removed',
      `Batch ${batch?.batchNumber || ''} has been removed.`,
      'info'
    );
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    setData((prev) => {
      const exists = prev.suppliers.some((s) => s.id === supplier.id);
      let updated: Supplier[];
      if (exists) {
        updated = prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s));
      } else {
        updated = [supplier, ...prev.suppliers];
      }
      return { ...prev, suppliers: updated, isDemoData: false };
    });

    addToast('Supplier Saved', `${supplier.name} added to suppliers directory.`);
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const s = data.suppliers.find((item) => item.id === supplierId);
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((item) => item.id !== supplierId),
    }));

    addToast('Supplier Removed', `${s?.name || 'Supplier'} deleted.`, 'info');
  };

  const handleRecordDispensing = async (record: DispensingRecord): Promise<boolean> => {
    setData((prev) => {
      const allocMap = new Map<string, number>();
      for (const a of record.batchAllocations) {
        allocMap.set(a.batchId, a.quantity);
      }

      const updatedBatches = prev.batches.map((b) => {
        if (allocMap.has(b.id)) {
          const deduct = allocMap.get(b.id)!;
          return {
            ...b,
            quantity: Math.max(0, b.quantity - deduct),
          };
        }
        return b;
      });

      return {
        ...prev,
        batches: updatedBatches,
        dispensingRecords: [record, ...prev.dispensingRecords],
      };
    });

    addToast(
      'Dispensing recorded successfully.',
      `Dispensed ${record.quantity} units of ${record.medicineName} using FEFO batch sequence.`
    );
    return true;
  };

  const handleDispenseFromView = async (params: {
    medicineId: string;
    quantity: number;
    patientName?: string;
    prescriptionNumber?: string;
    prescribedBy?: string;
    notes?: string;
    dispensedAt?: string;
    unitPrice?: number;
  }): Promise<boolean> => {
    const med = data.medicines.find((m) => m.id === params.medicineId);
    if (!med) {
      addToast('Dispense Error', 'Selected medicine does not exist.', 'error');
      return false;
    }

    const fefoResult = calculateFEFOAllocation(params.quantity, med.id, data.batches);
    if (!fefoResult.isSufficient) {
      addToast(
        'Insufficient Stock',
        `Cannot dispense ${params.quantity} units. Only ${fefoResult.totalAllocated} non-expired units available.`,
        'error'
      );
      return false;
    }

    try {
      let totalAmount = 0;
      for (const alloc of fefoResult.allocations) {
        const batch = data.batches.find((b) => b.id === alloc.batchId);
        const price = params.unitPrice || batch?.sellingPrice || batch?.purchasePrice || 0;
        totalAmount += alloc.quantity * price;
      }

      const record: DispensingRecord = {
        id: `disp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        medicineId: med.id,
        medicineName: med.name,
        quantity: params.quantity,
        batchAllocations: fefoResult.allocations,
        patientName: params.patientName,
        prescriptionNumber: params.prescriptionNumber,
        prescribedBy: params.prescribedBy,
        notes: params.notes,
        dispensedAt: params.dispensedAt || new Date().toISOString(),
        unitPrice:
          params.unitPrice ||
          (params.quantity > 0 && totalAmount > 0
            ? Number((totalAmount / params.quantity).toFixed(2))
            : undefined),
        totalAmount: totalAmount > 0 ? totalAmount : undefined,
      };

      await handleRecordDispensing(record);
      return true;
    } catch (err: any) {
      addToast('Dispense Failed', err?.message || 'An unexpected error occurred.', 'error');
      return false;
    }
  };

  // Demo Data controls
  const handleLoadDemoData = () => {
    const demo = generateDemoDataset();
    setData(demo);
    addToast(
      'Demo Dataset Loaded',
      'Sample pharmaceutical data populated with active & critical FEFO batches.',
      'info'
    );
  };

  const handleClearDemoData = () => {
    setData(INITIAL_EMPTY_DATA);
    addToast('Demo Data Cleared', 'The database has been restored to clean state.', 'info');
  };

  const handleClearAllData = () => {
    setData(INITIAL_EMPTY_DATA);
    addToast('Inventory Reset', 'All inventory and transaction records have been erased.', 'info');
  };

  const handleImportData = (imported: AppData) => {
    setData(imported);
    addToast(
      'Data Imported',
      `Restored ${imported.medicines.length} medicines and ${imported.batches.length} batches.`
    );
  };

  // Quick Action Triggers
  const triggerAddBatch = (medicineId?: string) => {
    setBatchTargetMedicineId(medicineId);
    setIsAddBatchOpen(true);
  };

  const triggerDispense = (medicineId?: string) => {
    setDispenseTargetMedicineId(medicineId);
    setIsDispenseOpen(true);
  };

  const triggerEditMedicine = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsAddMedicineOpen(true);
  };

  const hasMedicinesWithStock = data.medicines.some((m) =>
    data.batches.some((b) => b.medicineId === m.id && b.quantity > 0)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and System Status */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-sm">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  PharmaVault
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    FEFO Active
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  Pharmacy Inventory System
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                id="nav-dashboard-tab"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>

              <button
                id="nav-medicines-tab"
                onClick={() => setActiveTab('medicines')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'medicines'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Pill className="w-4 h-4" />
                Medicines
                {data.medicines.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {data.medicines.length}
                  </span>
                )}
              </button>

              <button
                id="nav-batches-tab"
                onClick={() => setActiveTab('batches')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'batches'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Box className="w-4 h-4" />
                Batches (FEFO)
                {data.batches.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {data.batches.length}
                  </span>
                )}
              </button>

              <button
                id="nav-dispense-tab"
                onClick={() => setActiveTab('dispense')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dispense'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Send className="w-4 h-4" />
                Dispense
              </button>

              <button
                id="nav-suppliers-tab"
                onClick={() => setActiveTab('suppliers')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'suppliers'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Truck className="w-4 h-4" />
                Suppliers
                {data.suppliers.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {data.suppliers.length}
                  </span>
                )}
              </button>

              <button
                id="nav-history-tab"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ReceiptText className="w-4 h-4" />
                History
              </button>

              <button
                id="nav-usage-tab"
                onClick={() => setActiveTab('usage')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'usage'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                Usage Intelligence
              </button>

              <button
                id="nav-settings-tab"
                onClick={() => setActiveTab('settings')}
                className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Settings & Demo Data"
              >
                <Settings className="w-4 h-4" />
              </button>
            </nav>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="header-quick-add-medicine-btn"
                onClick={() => {
                  setEditingMedicine(null);
                  setIsAddMedicineOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Medicine
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900 space-y-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab('medicines');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pill className="w-4 h-4" /> Medicines ({data.medicines.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('batches');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Box className="w-4 h-4" /> Batches (FEFO) ({data.batches.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('dispense');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Send className="w-4 h-4" /> Dispense
            </button>
            <button
              onClick={() => {
                setActiveTab('suppliers');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Truck className="w-4 h-4" /> Suppliers ({data.suppliers.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ReceiptText className="w-4 h-4" /> Dispensing History
            </button>
            <button
              onClick={() => {
                setActiveTab('usage');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Activity className="w-4 h-4" /> Usage Intelligence
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="w-4 h-4" /> Settings & Demo Data
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            data={data}
            onNavigate={(tab) => setActiveTab(tab as any)}
            onOpenAddMedicine={() => {
              setEditingMedicine(null);
              setIsAddMedicineOpen(true);
            }}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
            onOpenAddSupplier={() => setIsAddSupplierOpen(true)}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onViewMedicine={(m) => setViewingMedicine(m)}
          />
        )}

        {activeTab === 'medicines' && (
          <MedicinesView
            medicines={data.medicines}
            batches={data.batches}
            onOpenAddMedicine={() => {
              setEditingMedicine(null);
              setIsAddMedicineOpen(true);
            }}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onViewMedicine={(m) => setViewingMedicine(m)}
            onEditMedicine={triggerEditMedicine}
            onDeleteMedicine={handleDeleteMedicine}
          />
        )}

        {activeTab === 'batches' && (
          <BatchesView
            batches={data.batches}
            medicines={data.medicines}
            suppliers={data.suppliers}
            onOpenAddBatch={() => triggerAddBatch()}
            onDeleteBatch={handleDeleteBatch}
          />
        )}

        {activeTab === 'dispense' && (
          <ErrorBoundary fallbackMessage="Unable to load Dispense page. Please check your stock or try again.">
            <DispenseView
              medicines={data.medicines}
              batches={data.batches}
              onDispense={handleDispenseFromView}
              onOpenAddMedicine={() => {
                setEditingMedicine(null);
                setIsAddMedicineOpen(true);
              }}
              onOpenAddBatch={(medId) => triggerAddBatch(medId)}
              preselectedMedicineId={dispenseTargetMedicineId}
              onClearPreselectedMedicine={() => setDispenseTargetMedicineId(undefined)}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={data.suppliers}
            batches={data.batches}
            onOpenAddSupplier={() => setIsAddSupplierOpen(true)}
            onDeleteSupplier={handleDeleteSupplier}
          />
        )}

        {activeTab === 'history' && (
          <DispensingHistoryView
            records={data.dispensingRecords}
            onOpenDispense={() => triggerDispense()}
            hasMedicinesWithStock={hasMedicinesWithStock}
          />
        )}

        {activeTab === 'usage' && (
          <UsageIntelligenceView
            medicines={data.medicines}
            batches={data.batches}
            dispensingRecords={data.dispensingRecords}
            suppliers={data.suppliers}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
            onViewMedicine={(m) => setViewingMedicine(m)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            data={data}
            onLoadDemoData={handleLoadDemoData}
            onClearDemoData={handleClearDemoData}
            onClearAllData={handleClearAllData}
            onImportData={handleImportData}
          />
        )}
      </main>

      {/* Shared Modals */}
      <AddMedicineModal
        isOpen={isAddMedicineOpen}
        onClose={() => {
          setIsAddMedicineOpen(false);
          setEditingMedicine(null);
        }}
        onSave={handleSaveMedicine}
        initialData={editingMedicine}
      />

      <AddBatchModal
        isOpen={isAddBatchOpen}
        onClose={() => {
          setIsAddBatchOpen(false);
          setBatchTargetMedicineId(undefined);
        }}
        onSave={handleSaveBatch}
        medicines={data.medicines}
        suppliers={data.suppliers}
        selectedMedicineId={batchTargetMedicineId}
        onRequestAddSupplier={() => setIsAddSupplierOpen(true)}
      />

      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSave={handleSaveSupplier}
      />

      <MedicineDetailModal
        isOpen={Boolean(viewingMedicine)}
        onClose={() => setViewingMedicine(null)}
        medicine={viewingMedicine}
        batches={data.batches}
        dispensingRecords={data.dispensingRecords}
        allMedicines={data.medicines}
        onAddBatch={(medId) => {
          setViewingMedicine(null);
          triggerAddBatch(medId);
        }}
        onEditMedicine={(med) => {
          setViewingMedicine(null);
          triggerEditMedicine(med);
        }}
        onDeleteMedicine={(medId) => {
          handleDeleteMedicine(medId);
          setViewingMedicine(null);
        }}
        onDispenseMedicine={(medId) => {
          setViewingMedicine(null);
          triggerDispense(medId);
        }}
        onDeleteBatch={handleDeleteBatch}
      />

      <DispenseModal
        isOpen={isDispenseOpen}
        onClose={() => {
          setIsDispenseOpen(false);
          setDispenseTargetMedicineId(undefined);
        }}
        onDispense={handleRecordDispensing}
        medicines={data.medicines}
        batches={data.batches}
        initialMedicineId={dispenseTargetMedicineId}
      />
    </div>
  );
}
