import React, { useMemo } from 'react';
import { X, Pill, Plus, Calendar, AlertTriangle, ShieldCheck, Clock, Trash2, Edit3, Send, TrendingUp, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Batch, DispensingRecord, Medicine } from '../types';
import { getExpiryStatus, getMedicineInventory, sortBatchesFEFO } from '../utils/fefo';
import { classifyUsageVolumes } from '../utils/usageIntelligence';
import { MedicineImage } from './MedicineImage';

interface MedicineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  batches: Batch[];
  dispensingRecords?: DispensingRecord[];
  allMedicines?: Medicine[];
  onAddBatch: (medicineId: string) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicineId: string) => void;
  onDispenseMedicine: (medicineId: string) => void;
  onDeleteBatch?: (batchId: string) => void;
}

export const MedicineDetailModal: React.FC<MedicineDetailModalProps> = ({
  isOpen,
  onClose,
  medicine,
  batches,
  dispensingRecords = [],
  allMedicines = [],
  onAddBatch,
  onEditMedicine,
  onDeleteMedicine,
  onDispenseMedicine,
  onDeleteBatch,
}) => {
  if (!isOpen || !medicine) return null;

  const medBatches = batches.filter((b) => b.medicineId === medicine.id);
  const fefoSortedBatches = sortBatchesFEFO(medBatches);
  const inventory = getMedicineInventory(medicine.id, batches);

  const isLowStock = inventory.availableUnits <= medicine.minStockLevel && medicine.status === 'Active';
  const isOutOfStock = inventory.availableUnits === 0;

  // Compute 30-day Usage Intelligence for this medicine based on actual dispensing history
  const usageStats = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 86400000;
    const currentStart = now - thirtyDaysMs;
    const prevStart = currentStart - thirtyDaysMs;

    // Filter dispensing records for this medicine
    const medRecords = dispensingRecords.filter((r) => r && r.medicineId === medicine.id && r.dispensedAt);

    // Current period (last 30 days)
    const currentPeriodRecords = medRecords.filter((r) => {
      const t = new Date(r.dispensedAt).getTime();
      return t >= currentStart && t <= now;
    });

    // Previous period (30-60 days ago)
    const prevPeriodRecords = medRecords.filter((r) => {
      const t = new Date(r.dispensedAt).getTime();
      return t >= prevStart && t < currentStart;
    });

    const currentPeriodUsage = currentPeriodRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const prevPeriodUsage = prevPeriodRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const avgDailyUsage = Number((currentPeriodUsage / 30).toFixed(2));

    const daysRemaining = avgDailyUsage > 0 ? Number((inventory.availableUnits / avgDailyUsage).toFixed(1)) : null;

    // Usage Change %
    let usageChangePercent: number | null = null;
    let trendDirection: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' = 'insufficient_data';
    let trendMessage = 'Insufficient historical data';

    if (prevPeriodUsage > 0) {
      const pct = Math.round(((currentPeriodUsage - prevPeriodUsage) / prevPeriodUsage) * 100);
      usageChangePercent = pct;
      if (pct > 0) {
        trendDirection = 'increasing';
        trendMessage = `Demand increasing: usage is ${pct}% higher than the previous period.`;
      } else if (pct < 0) {
        trendDirection = 'decreasing';
        trendMessage = `Demand decreasing: usage is ${Math.abs(pct)}% lower than the previous period.`;
      } else {
        trendDirection = 'stable';
        trendMessage = 'Demand stable: usage is unchanged compared to previous period.';
      }
    } else if (prevPeriodUsage === 0 && currentPeriodUsage > 0) {
      trendDirection = 'increasing';
      usageChangePercent = null;
      trendMessage = `New usage detected (+${currentPeriodUsage} units in current period).`;
    }

    // Dynamic classification using all medicines' usage in this period
    const usageMap = new Map<string, number>();
    for (const r of dispensingRecords) {
      const t = new Date(r.dispensedAt).getTime();
      if (t >= currentStart && t <= now) {
        usageMap.set(r.medicineId, (usageMap.get(r.medicineId) || 0) + (Number(r.quantity) || 0));
      }
    }
    const classificationMap = classifyUsageVolumes(usageMap);
    const classification = classificationMap.get(medicine.id) || 'NO RECENT USAGE';

    // Chart data: daily usage points from actual history
    const dailyMap = new Map<string, number>();
    for (const r of medRecords) {
      const d = r.dispensedAt.split('T')[0];
      dailyMap.set(d, (dailyMap.get(d) || 0) + (Number(r.quantity) || 0));
    }

    const timeSeriesData: { date: string; quantity: number }[] = [];
    const sortedDates = Array.from(dailyMap.keys()).sort();
    for (const d of sortedDates) {
      timeSeriesData.push({
        date: d,
        quantity: dailyMap.get(d) || 0,
      });
    }

    return {
      hasUsage: medRecords.length > 0,
      totalUnitsUsed: currentPeriodUsage,
      currentPeriodUsage,
      prevPeriodUsage,
      avgDailyUsage,
      daysRemaining,
      usageChangePercent,
      trendDirection,
      trendMessage,
      classification,
      timeSeriesData,
      totalDispensingTransactions: medRecords.length,
    };
  }, [dispensingRecords, medicine.id, inventory.availableUnits]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="medicine-detail-modal-dialog"
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-start gap-4">
            <MedicineImage
              src={medicine.imageUrl}
              alt={medicine.name}
              size="md"
              className="mt-0.5 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {medicine.name}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                    medicine.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : medicine.status === 'Discontinued'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {medicine.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {medicine.genericName && <span className="font-medium text-slate-700 dark:text-slate-300">{medicine.genericName} • </span>}
                {medicine.dosageForm} {medicine.strength && `(${medicine.strength})`} • {medicine.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditMedicine(medicine)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit Medicine"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${medicine.name}" and all its batches?`)) {
                  onDeleteMedicine(medicine.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete Medicine"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Key Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Available Stock</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${isOutOfStock ? 'text-rose-600 dark:text-rose-400' : isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {inventory.availableUnits}
                </span>
                <span className="text-xs text-slate-500">{medicine.unit || 'units'}</span>
              </div>
              {isOutOfStock ? (
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                  <AlertTriangle className="w-3 h-3" /> Out of stock
                </span>
              ) : isLowStock ? (
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                  <AlertTriangle className="w-3 h-3" /> Below minimum ({medicine.minStockLevel})
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Optimal stock
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Minimum Level</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {medicine.minStockLevel}
                </span>
                <span className="text-xs text-slate-500">{medicine.unit || 'units'}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Reorder threshold</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Batches</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {inventory.activeBatchesCount}
                </span>
                <span className="text-xs text-slate-500">batches</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">In FEFO rotation</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Next Expiry (FEFO)</span>
              <div className="mt-1">
                {inventory.earliestExpiryDate ? (
                  <>
                    <span className="text-base font-bold text-slate-900 dark:text-white block truncate">
                      {inventory.earliestExpiryDate}
                    </span>
                    {(() => {
                      const exp = getExpiryStatus(inventory.earliestExpiryDate);
                      return (
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${exp.badgeClass}`}>
                          {exp.label}
                        </span>
                      );
                    })()}
                  </>
                ) : (
                  <span className="text-xs text-slate-400">No active batches</span>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Description & Info */}
          {medicine.description && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-sm">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1">
                Description & Storage Guidelines
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                {medicine.description}
              </p>
            </div>
          )}

          {/* Usage Intelligence Section */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Usage Intelligence
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real consumption velocity and demand analytics (30-day window)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Classification:</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                    usageStats.classification === 'HIGH USAGE'
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      : usageStats.classification === 'MODERATE'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : usageStats.classification === 'LOW USAGE'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {usageStats.classification}
                </span>
              </div>
            </div>

            {/* Metrics 4x2 Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Used (30d)</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {usageStats.totalUnitsUsed} <span className="text-xs font-normal text-slate-400">{medicine.unit || 'units'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Average Daily Usage</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {usageStats.avgDailyUsage} <span className="text-xs font-normal text-slate-400">/day</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Current Stock</span>
                <span className={`text-lg font-bold mt-0.5 block ${inventory.availableUnits <= medicine.minStockLevel ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {inventory.availableUnits} <span className="text-xs font-normal text-slate-400">{medicine.unit || 'units'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Days of Stock Remaining</span>
                {usageStats.daysRemaining !== null ? (
                  <span className={`text-lg font-bold mt-0.5 block ${usageStats.daysRemaining <= 7 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                    {usageStats.daysRemaining} <span className="text-xs font-normal text-slate-400">days</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic mt-1 block">No recent usage data</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Current Period Usage</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {usageStats.currentPeriodUsage} <span className="text-xs font-normal text-slate-400">{medicine.unit || 'units'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Previous Period Usage</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {usageStats.prevPeriodUsage} <span className="text-xs font-normal text-slate-400">{medicine.unit || 'units'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Usage Change %</span>
                {usageStats.usageChangePercent !== null ? (
                  <span className={`text-base font-bold mt-0.5 inline-flex items-center gap-0.5 ${usageStats.usageChangePercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : usageStats.usageChangePercent < 0 ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700'}`}>
                    {usageStats.usageChangePercent > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {usageStats.usageChangePercent > 0 ? `+${usageStats.usageChangePercent}%` : `${usageStats.usageChangePercent}%`}
                  </span>
                ) : usageStats.currentPeriodUsage > 0 ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">New usage detected</span>
                ) : (
                  <span className="text-xs text-slate-400 italic mt-1 block">Insufficient data</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Trend Classification</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 block">
                  {usageStats.trendMessage}
                </span>
              </div>
            </div>

            {/* Usage Over Time Line Chart */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Dispensing Volume Over Time (Units Dispensed)
              </span>

              {usageStats.timeSeriesData.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <Activity className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No dispensing data available yet.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Usage insights will appear after medicines are dispensed.
                  </p>
                </div>
              ) : (
                <div className="w-full h-44 bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageStats.timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="p-2 bg-slate-900 text-white text-xs rounded-lg shadow border border-slate-800">
                                <p className="font-semibold">{d.date}</p>
                                <p className="text-teal-400 font-bold">{d.quantity} {medicine.unit || 'units'} dispensed</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="quantity" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#usageGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Batches Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Batches (FEFO Priority Queue)</span>
                  <span className="text-xs font-normal text-slate-400">
                    — Earliest expiring batches dispensed first
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {inventory.availableUnits > 0 && (
                  <button
                    id="medicine-detail-dispense-btn"
                    onClick={() => {
                      onClose();
                      onDispenseMedicine(medicine.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dispense Medicine
                  </button>
                )}
                <button
                  id="medicine-detail-add-batch-btn"
                  onClick={() => onAddBatch(medicine.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Batch
                </button>
              </div>
            </div>

            {fefoSortedBatches.length === 0 ? (
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No medicine batches available.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "Add Batch" to enter batch numbers, quantities, manufacturing and expiry dates.
                </p>
                <button
                  id="detail-empty-add-batch-btn"
                  onClick={() => onAddBatch(medicine.id)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Batch
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">FEFO Priority</th>
                      <th className="py-2.5 px-3">Batch No</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">Expiry Status</th>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3">Pricing</th>
                      {onDeleteBatch && <th className="py-2.5 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {fefoSortedBatches.map((b, idx) => {
                      const exp = getExpiryStatus(b.expiryDate);
                      const isExpired = exp.status === 'EXPIRED';

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
                            isExpired ? 'opacity-60 bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                            {b.batchNumber}
                            {b.manufacturingDate && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Mfg: {b.manufacturingDate}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {b.quantity}
                            </span>
                            <span className="text-slate-400 ml-1">/ {b.initialQuantity}</span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {b.expiryDate}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10px] border ${exp.badgeClass}`}>
                              {exp.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {b.supplierName || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            <div>Buy: ${b.purchasePrice ? b.purchasePrice.toFixed(2) : '—'}</div>
                            <div>Sell: ${b.sellingPrice ? b.sellingPrice.toFixed(2) : '—'}</div>
                          </td>
                          {onDeleteBatch && (
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  if (confirm(`Remove batch ${b.batchNumber}?`)) {
                                    onDeleteBatch(b.id);
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                                title="Remove Batch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-400">
            Created: {new Date(medicine.createdAt).toLocaleDateString()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
