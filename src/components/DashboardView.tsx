import React, { useMemo } from 'react';
import { Pill, Box, Truck, AlertTriangle, ArrowRight, ShieldCheck, Send, Plus, Sparkles, Clock, RefreshCw, Activity, TrendingUp } from 'lucide-react';
import { AppData, Batch, Medicine, Supplier } from '../types';
import { computeReorderRecommendations, getDaysUntil, getExpiryStatus, getMedicineInventory, sortBatchesFEFO } from '../utils/fefo';
import { EmptyState } from './EmptyState';
import { FastMovingMedicinesCard } from './FastMovingMedicinesCard';
import { calculateUsageIntelligence } from '../utils/usageIntelligence';
import { HeroBanner, backgroundImages } from './HeroBanner';

export { backgroundImages };

interface DashboardViewProps {
  data: AppData;
  onNavigate: (tab: string) => void;
  onOpenAddMedicine: () => void;
  onOpenAddBatch: (medicineId?: string) => void;
  onOpenAddSupplier: () => void;
  onOpenDispense: (medicineId?: string) => void;
  onViewMedicine: (medicine: Medicine) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onOpenAddMedicine,
  onOpenAddBatch,
  onOpenAddSupplier,
  onOpenDispense,
  onViewMedicine,
}) => {
  const { medicines, batches, suppliers, dispensingRecords } = data;

  // Calculate totals
  const totalMedicines = medicines.length;
  let totalAvailableUnits = 0;
  let totalExpiredUnits = 0;
  let criticalExpiryBatches = 0;
  let expiredBatches = 0;

  for (const b of batches) {
    const days = getDaysUntil(b.expiryDate);
    if (days < 0) {
      totalExpiredUnits += b.quantity;
      if (b.quantity > 0) expiredBatches++;
    } else {
      totalAvailableUnits += b.quantity;
      if (b.quantity > 0 && days <= 30) {
        criticalExpiryBatches++;
      }
    }
  }
 
  // Usage Intelligence (computed strictly from actual database dispensing records)
  const usageIntel = useMemo(() => {
    return calculateUsageIntelligence(medicines, batches, dispensingRecords, suppliers);
  }, [medicines, batches, dispensingRecords, suppliers]);

  const reorderRecommendations = useMemo(() => {
    return computeReorderRecommendations(medicines, batches, suppliers, dispensingRecords);
  }, [medicines, batches, suppliers, dispensingRecords]);

  // Near expiry batches for FEFO alert
  const activeBatches = batches.filter((b) => b.quantity > 0);
  const fefoUpcoming = sortBatchesFEFO(activeBatches).slice(0, 5);

  // If completely empty database, show prominent first-time user experience
  const hasNoData = medicines.length === 0;

  return (
    <div className="space-y-6">
      {/* High-Resolution Professional Healthcare & Pharmacy Hero Banner with 3 Rotating Visuals */}
      <HeroBanner
        onOpenAddMedicine={onOpenAddMedicine}
        onOpenAddBatch={() => onOpenAddBatch()}
        onOpenDispense={() => onOpenDispense()}
        hasMedicines={medicines.length > 0}
        totalMedicines={totalMedicines}
        totalAvailableUnits={totalAvailableUnits}
      />

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pharmacy Operations & Quick Actions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time inventory levels, First-Expired First-Out (FEFO) queues, and dispensing controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {medicines.length > 0 && totalAvailableUnits > 0 && (
            <button
              id="dashboard-dispense-action-btn"
              onClick={() => onOpenDispense()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Dispense (FEFO)
            </button>
          )}

          {medicines.length > 0 && (
            <button
              id="dashboard-add-batch-action-btn"
              onClick={() => onOpenAddBatch()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Batch
            </button>
          )}

          <button
            id="dashboard-add-medicine-action-btn"
            onClick={onOpenAddMedicine}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Medicine
          </button>
        </div>
      </div>

      {/* When database is empty, display requested clean empty state */}
      {hasNoData ? (
        <div className="space-y-6">
          <EmptyState
            type="medicines"
            onAction={onOpenAddMedicine}
            customTitle="No medicines added yet."
            customDescription="Start by adding your first medicine to begin managing your inventory."
            actionLabel="+ Add Medicine"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">1. Create Medicine</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register clinical names, generic formulations, packaging units, and minimum safety stock levels.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
                  <Box className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">2. Receive Batches</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log batch numbers, quantities, manufacturing and expiry dates linked to your registered suppliers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">3. FEFO Dispensing</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically allocate outgoing medicine from earliest-expiring stock to prevent wastage.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Registered Medicines
                </span>
                <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Pill className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {totalMedicines}
                </span>
                <span className="text-xs text-slate-500">items</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {medicines.filter((m) => m.status === 'Active').length} active in catalog
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Available Stock
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Box className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {totalAvailableUnits}
                </span>
                <span className="text-xs text-slate-500">units</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Across {batches.filter((b) => b.quantity > 0).length} unexpired batches
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Critical / Expiring Soon
                </span>
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${criticalExpiryBatches > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {criticalExpiryBatches}
                </span>
                <span className="text-xs text-slate-500">batches (&le; 30d)</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {expiredBatches > 0 ? (
                  <span className="text-rose-500 font-medium">{expiredBatches} already expired</span>
                ) : (
                  'No expired batches'
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Reorder Alerts
                </span>
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${reorderRecommendations.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {reorderRecommendations.length}
                </span>
                <span className="text-xs text-slate-500">items below min</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {reorderRecommendations.length > 0 ? 'Replenishment recommended' : 'All stocks sufficient'}
              </div>
            </div>
          </div>

          {/* Urgent Reorder Review Alert (High Usage + Depleted Stock) */}
          {usageIntel.urgentReorderCount > 0 && (
            <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                        URGENT REORDER REVIEW
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-200/70 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                        {usageIntel.urgentReorderCount} critical {usageIntel.urgentReorderCount === 1 ? 'shortage' : 'shortages'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      High usage velocity combined with low stock detected.
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Recommendation: Review reorder quantity and supplier lead times immediately. The system only recommends action; this is not an automatic purchase.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('usage')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  View Usage Intelligence
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Fast-Moving Medicines Section */}
          <FastMovingMedicinesCard
            metrics={usageIntel.metrics}
            onViewAllUsage={() => onNavigate('usage')}
            onViewMedicine={onViewMedicine}
            medicines={medicines}
          />

          {/* Reorder Recommendations & FEFO Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reorder Recommendations */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Reorder Recommendations
                  </h3>
                  {reorderRecommendations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {reorderRecommendations.length}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">Stock &le; Minimum Level</span>
              </div>

              {reorderRecommendations.length === 0 ? (
                <EmptyState type="reorder" />
              ) : (
                <div className="space-y-3">
                  {reorderRecommendations.slice(0, 4).map((rec) => (
                    <div
                      key={rec.medicine.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                            {rec.medicine.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-medium">
                            Stock: {rec.currentStock} / Min: {rec.minStockLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Suggested order: <span className="font-bold text-slate-800 dark:text-slate-200">{rec.suggestedReorderQuantity} {rec.medicine.unit || 'units'}</span>
                          {rec.preferredSupplier && (
                            <span className="ml-2">• Supplier: {rec.preferredSupplier.name} ({rec.preferredSupplier.leadTimeDays}d lead)</span>
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => onOpenAddBatch(rec.medicine.id)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Receive Batch
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FEFO Expiry Queue (Next to Expire) */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                    FEFO Priority Rotation Queue
                  </h3>
                </div>
                <span className="text-xs text-slate-400">First-Expired, First-Out</span>
              </div>

              {fefoUpcoming.length === 0 ? (
                <EmptyState
                  type="batches"
                  onAction={() => onOpenAddBatch()}
                  actionLabel="+ Add Batch"
                />
              ) : (
                <div className="space-y-3">
                  {fefoUpcoming.map((b, idx) => {
                    const exp = getExpiryStatus(b.expiryDate);
                    return (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {b.medicineName}
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Batch: {b.batchNumber} • {b.quantity} units available
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10px] border ${exp.badgeClass}`}>
                            {exp.label}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Exp: {b.expiryDate}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
