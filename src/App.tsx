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
  Receipt,
  Boxes,
  Clock,
  Bell,
  BarChart3,
  TrendingUp,
  FileText,
  User,
  LogOut,
  Sparkles,
  Database,
  ChevronDown,
} from 'lucide-react';
import { AppData, Batch, DispensingRecord, Medicine, SalesBill, Supplier, UserProfile } from './types';
import {
  getInitialOrStoredData,
  persistAppData,
  generateDemoDataset,
  INITIAL_EMPTY_DATA,
} from './utils/storage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
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
import { BillingView } from './components/BillingView';
import { SeasonalAnalyticsView } from './components/SeasonalAnalyticsView';
import { InventoryView } from './components/InventoryView';
import { ExpiryManagementView } from './components/ExpiryManagementView';
import { AlertsView } from './components/AlertsView';
import { ReportsView } from './components/ReportsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { calculateFEFOAllocation } from './utils/fefo';
import {
  fetchRemoteMedicines,
  saveRemoteMedicine,
  deleteRemoteMedicine,
  fetchRemoteBatches,
  saveRemoteBatch,
  deleteRemoteBatch,
  fetchRemoteSuppliers,
  saveRemoteSupplier,
  deleteRemoteSupplier,
  fetchRemoteDispensingRecords,
  saveRemoteDispensingRecord,
  fetchRemoteSalesBills,
  saveRemoteSalesBill,
  refundOrCancelRemoteBill,
} from './utils/supabaseDb';

export type MainNavTab =
  | 'dashboard'
  | 'medicines'
  | 'batches'
  | 'inventory'
  | 'dispense'
  | 'billing'
  | 'suppliers'
  | 'expiry'
  | 'alerts'
  | 'usage'
  | 'seasonal'
  | 'reports'
  | 'settings';

function PharmaVaultApp() {
  const {
    user,
    profile,
    isLoading: isAuthLoading,
    isSupabaseConnected,
    isSandboxMode,
    signOut,
    updateProfile,
  } = useAuth();

  // Inventory state
  const [data, setData] = useState<AppData>(() => getInitialOrStoredData());
  const [isDataSyncing, setIsDataSyncing] = useState<boolean>(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

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

  // Multi-user data loading on login or user switch
  useEffect(() => {
    if (!user || !isSupabaseConnected) {
      if (isSandboxMode) {
        // Load local storage
        setData(getInitialOrStoredData());
      }
      return;
    }

    let isMounted = true;
    setIsDataSyncing(true);

    Promise.all([
      fetchRemoteMedicines(user.id),
      fetchRemoteBatches(user.id),
      fetchRemoteSuppliers(user.id),
      fetchRemoteDispensingRecords(user.id),
      fetchRemoteSalesBills(user.id),
    ])
      .then(([meds, batches, sups, disp, bills]) => {
        if (!isMounted) return;
        setData({
          medicines: meds,
          batches: batches,
          suppliers: sups,
          dispensingRecords: disp,
          salesBills: bills,
          profile: profile || undefined,
          isDemoData: false,
        });
        setIsDataSyncing(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to sync remote data:', err);
        setIsDataSyncing(false);
        addToast('Sync Notice', 'Failed to retrieve cloud data. Check connection.', 'error');
      });

    return () => {
      isMounted = false;
    };
  }, [user, isSupabaseConnected, isSandboxMode, profile, addToast]);

  // Persist locally only if in sandbox mode
  useEffect(() => {
    if (isSandboxMode || (!user && !isSupabaseConnected)) {
      persistAppData(data);
    }
  }, [data, isSandboxMode, user, isSupabaseConnected]);

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

  // ===========================================================================
  // DATA OPERATIONS WITH SUPABASE POSTGRESQL & LOCAL ISOLATION
  // ===========================================================================
  const handleSaveMedicine = async (medicine: Medicine) => {
    // 1. Optimistic local state update
    setData((prev) => {
      const exists = prev.medicines.some((m) => m.id === medicine.id);
      const updatedMedicines = exists
        ? prev.medicines.map((m) => (m.id === medicine.id ? medicine : m))
        : [medicine, ...prev.medicines];
      return { ...prev, medicines: updatedMedicines, isDemoData: false };
    });

    // 2. Persist to Supabase if connected
    if (user && isSupabaseConnected) {
      await saveRemoteMedicine(user.id, medicine);
    }

    addToast(
      medicine.id && data.medicines.some((m) => m.id === medicine.id)
        ? 'Medicine Updated'
        : 'Medicine Added',
      `${medicine.name} (${medicine.dosageForm}) saved to catalog.`
    );
  };

  const handleDeleteMedicine = async (medicineId: string) => {
    const med = data.medicines.find((m) => m.id === medicineId);
    setData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((m) => m.id !== medicineId),
      batches: prev.batches.filter((b) => b.medicineId !== medicineId),
    }));

    if (viewingMedicine && viewingMedicine.id === medicineId) {
      setViewingMedicine(null);
    }

    if (user && isSupabaseConnected) {
      await deleteRemoteMedicine(user.id, medicineId);
    }

    addToast(
      'Medicine Deleted',
      `${med?.name || 'Medicine'} removed from inventory.`,
      'info'
    );
  };

  const handleSaveBatch = async (batch: Batch) => {
    setData((prev) => {
      const exists = prev.batches.some((b) => b.id === batch.id);
      const updatedBatches = exists
        ? prev.batches.map((b) => (b.id === batch.id ? batch : b))
        : [batch, ...prev.batches];
      return { ...prev, batches: updatedBatches, isDemoData: false };
    });

    if (user && isSupabaseConnected) {
      await saveRemoteBatch(user.id, batch);
    }

    addToast(
      'Batch Registered',
      `Batch ${batch.batchNumber} (${batch.quantity} units) registered for ${batch.medicineName}.`
    );
  };

  const handleDeleteBatch = async (batchId: string) => {
    const batch = data.batches.find((b) => b.id === batchId);
    setData((prev) => ({
      ...prev,
      batches: prev.batches.filter((b) => b.id !== batchId),
    }));

    if (user && isSupabaseConnected) {
      await deleteRemoteBatch(user.id, batchId);
    }

    addToast('Batch Removed', `Batch ${batch?.batchNumber || ''} has been removed.`, 'info');
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    setData((prev) => {
      const exists = prev.suppliers.some((s) => s.id === supplier.id);
      const updated = exists
        ? prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
        : [supplier, ...prev.suppliers];
      return { ...prev, suppliers: updated, isDemoData: false };
    });

    if (user && isSupabaseConnected) {
      await saveRemoteSupplier(user.id, supplier);
    }

    addToast('Supplier Saved', `${supplier.name} added to suppliers directory.`);
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    const s = data.suppliers.find((item) => item.id === supplierId);
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((item) => item.id !== supplierId),
    }));

    if (user && isSupabaseConnected) {
      await deleteRemoteSupplier(user.id, supplierId);
    }

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

    if (user && isSupabaseConnected) {
      await saveRemoteDispensingRecord(user.id, record);
    }

    addToast(
      'Dispensing recorded successfully.',
      `Dispensed ${record.quantity} units of ${record.medicineName} using FEFO sequence.`
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

  // BILLING OPERATIONS
  const handleSaveSalesBill = async (bill: SalesBill): Promise<boolean> => {
    // Deduct batches in local state
    setData((prev) => {
      const allocMap = new Map<string, number>();
      for (const item of bill.items) {
        allocMap.set(item.batchId, (allocMap.get(item.batchId) || 0) + item.quantity);
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
        salesBills: [bill, ...prev.salesBills],
      };
    });

    if (user && isSupabaseConnected) {
      await saveRemoteSalesBill(user.id, bill);
    }

    addToast(
      'Sale Recorded',
      `Invoice #${bill.billNumber} created with ${bill.items.length} items. Stock updated.`
    );
    return true;
  };

  const handleRefundSalesBill = async (bill: SalesBill, restoreStock: boolean): Promise<boolean> => {
    setData((prev) => {
      let updatedBatches = [...prev.batches];
      if (restoreStock) {
        const itemMap = new Map<string, number>();
        for (const item of bill.items) {
          itemMap.set(item.batchId, (itemMap.get(item.batchId) || 0) + item.quantity);
        }
        updatedBatches = prev.batches.map((b) => {
          if (itemMap.has(b.id)) {
            return { ...b, quantity: b.quantity + itemMap.get(b.id)! };
          }
          return b;
        });
      }

      const updatedBills = prev.salesBills.map((b) =>
        b.id === bill.id
          ? ({ ...b, status: 'Cancelled' as const, paymentStatus: 'Refunded' as const } as SalesBill)
          : b
      );

      return {
        ...prev,
        batches: updatedBatches,
        salesBills: updatedBills,
      };
    });

    if (user && isSupabaseConnected) {
      await refundOrCancelRemoteBill(user.id, bill, restoreStock);
    }

    addToast('Invoice Refunded', `Invoice #${bill.billNumber} cancelled${restoreStock ? ' and stock restored' : ''}.`, 'info');
    return true;
  };

  // DEMO DATA HANDLERS
  const handleLoadDemoData = () => {
    const demo = generateDemoDataset();
    setData(demo);
    addToast(
      'Demo Dataset Loaded',
      'Sample medicines, batches, and suppliers loaded for inspection.',
      'info'
    );
  };

  const handleClearDemoData = () => {
    setData(INITIAL_EMPTY_DATA);
    addToast('Demo Data Cleared', 'Vault restored to empty state.', 'info');
  };

  const handleClearAllData = () => {
    setData(INITIAL_EMPTY_DATA);
    addToast('Inventory Reset', 'All inventory records erased.', 'info');
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

  // Authentication Boundary: Show loading screen or login view
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-900/30 mb-4 animate-pulse">
          <Pill className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">PharmaVault</h2>
        <p className="text-xs text-slate-400 mt-1">Initializing secure session & database credentials...</p>
      </div>
    );
  }

  if (!user && !isSandboxMode) {
    return <AuthView />;
  }

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
                  Smart Inventory. Safer Medicines.
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Scrollable/Wrap) */}
            <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto py-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'medicines', label: `Medicines (${data.medicines.length})`, icon: Pill },
                { id: 'batches', label: `Batches (${data.batches.length})`, icon: Box },
                { id: 'inventory', label: 'Inventory', icon: Boxes },
                { id: 'dispense', label: 'Dispense', icon: Send },
                { id: 'billing', label: 'Billing & Sales', icon: Receipt },
                { id: 'suppliers', label: `Suppliers (${data.suppliers.length})`, icon: Truck },
                { id: 'expiry', label: 'Expiry Monitor', icon: Clock },
                { id: 'alerts', label: 'Alerts', icon: Bell },
                { id: 'seasonal', label: 'Seasonal & Forecasts', icon: BarChart3 },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MainNavTab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions & User Profile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="header-quick-add-medicine-btn"
                onClick={() => {
                  setEditingMedicine(null);
                  setIsAddMedicineOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Medicine
              </button>

              {/* User Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                    {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <span className="hidden md:block text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-28 truncate">
                    {profile?.fullName || (user?.email ? user.email.split('@')[0] : 'Pharmacist')}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 text-xs space-y-2">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {profile?.fullName || 'Pharmacist'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {user?.email || 'Clinical Demo Sandbox'}
                      </div>
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                        {profile?.pharmacyName || 'PharmaVault'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-1 text-[11px] text-slate-500">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isSupabaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span>
                        {isSupabaseConnected ? 'Supabase RLS Active' : 'Offline Sandbox'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings & Setup
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900 space-y-1 max-h-96 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'medicines', label: `Medicines (${data.medicines.length})`, icon: Pill },
              { id: 'batches', label: `Batches (${data.batches.length})`, icon: Box },
              { id: 'inventory', label: 'Inventory', icon: Boxes },
              { id: 'dispense', label: 'Dispense', icon: Send },
              { id: 'billing', label: 'Billing & Sales', icon: Receipt },
              { id: 'suppliers', label: `Suppliers (${data.suppliers.length})`, icon: Truck },
              { id: 'expiry', label: 'Expiry Monitor', icon: Clock },
              { id: 'alerts', label: 'Alerts', icon: Bell },
              { id: 'seasonal', label: 'Seasonal & Forecasts', icon: BarChart3 },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as MainNavTab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            data={data}
            onNavigate={(tab) => setActiveTab(tab as MainNavTab)}
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

        {activeTab === 'inventory' && (
          <InventoryView
            medicines={data.medicines}
            batches={data.batches}
            profile={profile}
            onOpenAddMedicine={() => {
              setEditingMedicine(null);
              setIsAddMedicineOpen(true);
            }}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onViewMedicine={(m) => setViewingMedicine(m)}
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

        {activeTab === 'billing' && (
          <BillingView
            medicines={data.medicines}
            batches={data.batches}
            salesBills={data.salesBills}
            profile={profile}
            onSaveBill={handleSaveSalesBill}
            onRefundBill={handleRefundSalesBill}
            onOpenAddMedicine={() => {
              setEditingMedicine(null);
              setIsAddMedicineOpen(true);
            }}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={data.suppliers}
            batches={data.batches}
            onOpenAddSupplier={() => setIsAddSupplierOpen(true)}
            onDeleteSupplier={handleDeleteSupplier}
          />
        )}

        {activeTab === 'expiry' && (
          <ExpiryManagementView
            batches={data.batches}
            medicines={data.medicines}
            suppliers={data.suppliers}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onDeleteBatch={handleDeleteBatch}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            medicines={data.medicines}
            batches={data.batches}
            suppliers={data.suppliers}
            dispensingRecords={data.dispensingRecords}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
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

        {activeTab === 'seasonal' && (
          <SeasonalAnalyticsView
            medicines={data.medicines}
            batches={data.batches}
            dispensingRecords={data.dispensingRecords}
            salesBills={data.salesBills}
            suppliers={data.suppliers}
            profile={profile}
            onOpenDispense={(medId) => triggerDispense(medId)}
            onOpenAddBatch={(medId) => triggerAddBatch(medId)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            medicines={data.medicines}
            batches={data.batches}
            dispensingRecords={data.dispensingRecords}
            salesBills={data.salesBills}
            suppliers={data.suppliers}
            profile={profile}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            data={data}
            profile={profile}
            onUpdateProfile={updateProfile}
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

export default function App() {
  return (
    <AuthProvider>
      <PharmaVaultApp />
    </AuthProvider>
  );
}
