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
  AlertTriangle,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
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
  // Inventory database state: ALWAYS STARTS COMPLETELY EMPTY FOR NEW USERS
  const [data, setData] = useState<AppData>(() => getInitialOrStoredData());

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'medicines' | 'batches' | 'dispense' | 'suppliers' | 'history' | 'usage' | 'settings'
  >('medicines');

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

  // Save to localStorage whenever data changes
  useEffect(() => {
    persistAppData(data);
  }, [data]);

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
      return {
        ...prev,
        medicines: updatedMedicines,
      };
    });

    addToast(
      editingMedicine ? 'Medicine Updated' : 'Medicine Created Successfully',
      `"${medicine.name}" is now available for adding batches and FEFO dispensing.`
    );
    setEditingMedicine(null);
  };

  const handleDeleteMedicine = (medicineId: string) => {
    const med = data.medicines.find((m) => m.id === medicineId);
    setData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((m) => m.id !== medicineId),
      batches: prev.batches.filter((b) => b.medicineId !== medicineId),
    }));
    addToast('Medicine Deleted', `"${med?.name || 'Item'}" and associated batches removed.`);
  };

  const handleSaveBatch = (batch: Batch) => {
    setData((prev) => ({
      ...prev,
      batches: [...prev.batches, batch],
    }));

    addToast(
      'Batch Added to Inventory',
      `Batch ${batch.batchNumber} (${batch.quantity} units) registered in FEFO rotation.`
    );
  };

  const handleDeleteBatch = (batchId: string) => {
    const b = data.batches.find((item) => item.id === batchId);
    setData((prev) => ({
      ...prev,
      batches: prev.batches.filter((item) => item.id !== batchId),
    }));
    addToast('Batch Removed', `Batch ${b?.batchNumber || 'record'} has been deleted.`);
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    setData((prev) => ({
      ...prev,
      suppliers: [...prev.suppliers, supplier],
    }));
    addToast(
      'Supplier Registered',
      `"${supplier.name}" is now available for incoming batch assignments.`
    );
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const s = data.suppliers.find((sup) => sup.id === supplierId);
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((sup) => sup.id !== supplierId),
    }));
    addToast('Supplier Removed', `"${s?.name || 'Supplier'}" removed.`);
  };

  const handleDispense = (record: DispensingRecord) => {
    setData((prev) => {
      // Decrement quantities from batches based on allocations
      const updatedBatches = prev.batches.map((b) => {
        const alloc = record.batchAllocations.find((a) => a.batchId === b.id);
        if (alloc) {
          return {
            ...b,
            quantity: Math.max(0, b.quantity - alloc.quantity),
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
  };

  const handleDispenseFromView = async (params: {
    medicineId: string;
    quantity: number;
    patientName?: string;
    prescriptionNumber?: string;
    prescribedBy?: string;
    notes?: string;
    unitPrice?: number;
    dispensedAt?: string;
  }): Promise<boolean> => {
    try {
      const med = data.medicines.find((m) => m.id === params.medicineId);
      if (!med) {
        addToast('Dispensing Error', 'Selected medicine not found in inventory.', 'error');
        return false;
      }

      const fefoResult = calculateFEFOAllocation(params.quantity, params.medicineId, data.batches, false);
      if (!fefoResult.isSufficient || fefoResult.allocations.length === 0) {
        addToast(
          'Insufficient Stock',
          `Cannot dispense ${params.quantity} units. Only ${fefoResult.totalAvailable} valid unexpired units available.`,
          'error'
        );
        return false;
      }

      let totalAmount = 0;
      for (const alloc of fefoResult.allocations) {
        const b = data.batches.find((item) => item.id === alloc.batchId);
        if (b && b.sellingPrice) {
          totalAmount += b.sellingPrice * alloc.quantity;
        }
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
        totalAmount: totalAmount > 0 ? totalAmount : undefined,
      };

      handleDispense(record);
      return true;
    } catch (err: any) {
      console.error('Dispensing operation failed:', err);
      addToast('Dispensing Failed', 'Unable to process dispensing. Please check stock and try again.', 'error');
      return false;
    }
  };

  const handleLoadDemoData = () => {
    const demo = generateDemoDataset();
    setData(demo);
    addToast(
      'Demo Data Loaded',
      'Sample medicines, FEFO batches, and suppliers have been populated.',
      'info'
    );
  };

  const handleClearDemoData = () => {
    setData(INITIAL_EMPTY_DATA);
    addToast(
      'Demo Data Cleared',
      'Inventory reset to clean empty database.',
      'info'
    );
  };

  const handleClearAllData = () => {
    setData(INITIAL_EMPTY_DATA);
    addToast(
      'Inventory Reset',
      'All medicines, batches, suppliers, and dispensing records erased.',
      'info'
    );
  };

  const handleImportData = (imported: AppData) => {
    setData(imported);
    addToast(
      'Database Restored',
      `Imported ${imported.medicines.length} medicines and ${imported.batches.length} batches.`
    );
  };

  // Helper to open Add Batch modal with preselected medicine
  const triggerAddBatch = (medicineId?: string) => {
    setBatchTargetMedicineId(medicineId);
    setIsAddBatchOpen(true);
  };

  // Helper to open Dispense view/page with preselected medicine
  const triggerDispense = (medicineId?: string) => {
    setDispenseTargetMedicineId(medicineId);
    setActiveTab('dispense');
  };

  // Helper to edit medicine
  const triggerEditMedicine = (med: Medicine) => {
    setEditingMedicine(med);
    setIsAddMedicineOpen(true);
  };

  const hasMedicinesWithStock = data.batches.some((b) => b.quantity > 0);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Demo Data Banner when active as required */}
      {data.isDemoData && (
        <div
          id="demo-data-indicator-banner"
          className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-40"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-900 text-amber-100 text-[10px] uppercase tracking-wider font-extrabold">
              Demo Data
            </span>
            <span>
              You are currently viewing demonstration inventory. The regular app starts completely empty.
            </span>
          </div>
          <button
            id="banner-clear-demo-data-btn"
            onClick={handleClearDemoData}
            className="px-2.5 py-1 rounded-md bg-amber-950 text-amber-100 hover:bg-black font-medium transition-colors cursor-pointer text-[11px]"
          >
            Clear Demo Data
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  PharmVault
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

            {/* Quick Action + Add Medicine Button in Navbar */}
            <div className="flex items-center gap-2">
              <button
                id="header-quick-add-medicine-btn"
                onClick={() => {
                  setEditingMedicine(null);
                  setIsAddMedicineOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
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
              <Box className="w-4 h-4" /> Batches ({data.batches.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('dispense');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'dispense'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Send className="w-4 h-4" /> Dispense Medicine
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
              <ReceiptText className="w-4 h-4" /> Dispensing Logs
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

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            PharmVault System • Clean-Start Pharmacy & Inventory Engine
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Demo Data Options
            </button>
            <span>•</span>
            <span className="text-teal-600 dark:text-teal-400 font-medium">
              FEFO Priority Enabled
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
        onRequestAddSupplier={() => {
          setIsAddSupplierOpen(true);
        }}
      />

      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSave={handleSaveSupplier}
      />

      <DispenseModal
        isOpen={isDispenseOpen}
        onClose={() => {
          setIsDispenseOpen(false);
          setDispenseTargetMedicineId(undefined);
        }}
        onDispense={handleDispense}
        medicines={data.medicines}
        batches={data.batches}
        initialMedicineId={dispenseTargetMedicineId}
      />

      <MedicineDetailModal
        isOpen={Boolean(viewingMedicine)}
        onClose={() => setViewingMedicine(null)}
        medicine={viewingMedicine}
        batches={data.batches}
        dispensingRecords={data.dispensingRecords}
        allMedicines={data.medicines}
        onAddBatch={(medId) => triggerAddBatch(medId)}
        onEditMedicine={triggerEditMedicine}
        onDeleteMedicine={handleDeleteMedicine}
        onDispenseMedicine={(medId) => triggerDispense(medId)}
        onDeleteBatch={handleDeleteBatch}
      />
    </div>
  );
}
