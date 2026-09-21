import React, { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Send,
  Plus,
  Calendar,
  Sparkles,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Batch,
  DispensingRecord,
  Medicine,
  MedicineUsageMetrics,
  Supplier,
  UsagePeriodFilter,
} from '../types';
import {
  calculateUsageIntelligence,
  getPeriodDateBoundaries,
} from '../utils/usageIntelligence';

interface UsageIntelligenceViewProps {
  medicines: Medicine[];
  batches: Batch[];
  dispensingRecords: DispensingRecord[];
  suppliers: Supplier[];
  onOpenDispense: (medicineId?: string) => void;
  onOpenAddBatch: (medicineId?: string) => void;
  onViewMedicine: (medicine: Medicine) => void;
}

export const UsageIntelligenceView: React.FC<UsageIntelligenceViewProps> = ({
  medicines,
  batches,
  dispensingRecords,
  suppliers,
  onOpenDispense,
  onOpenAddBatch,
  onViewMedicine,
}) => {
  // Period filter state (default 30 days)
  const [periodFilter, setPeriodFilter] = useState<UsagePeriodFilter>('30d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HIGH' | 'MODERATE' | 'LOW' | 'URGENT'>('ALL');

  // Compute period boundaries
  const periodConfig = useMemo(() => {
    return getPeriodDateBoundaries(periodFilter, {
      start: customStart,
      end: customEnd,
    });
  }, [periodFilter, customStart, customEnd]);

  // Compute full usage intelligence dynamically from real database records
  const intelligence = useMemo(() => {
    return calculateUsageIntelligence(
      medicines,
      batches,
      dispensingRecords,
      suppliers,
      periodConfig
    );
  }, [medicines, batches, dispensingRecords, suppliers, periodConfig]);

  const {
    metrics,
    totalDispensedInPeriod,
    totalTransactionsInPeriod,
    highUsageCount,
    urgentReorderCount,
    fastMovingMedicines,
    usageAlerts,
  } = intelligence;

  // Filter metrics for table
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const matchesSearch =
        m.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genericName && m.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'URGENT') return m.isUrgentReorder;
      if (statusFilter === 'HIGH') return m.classification === 'HIGH USAGE';
      if (statusFilter === 'MODERATE') return m.classification === 'MODERATE';
      if (statusFilter === 'LOW') return m.classification === 'LOW USAGE';
      return true;
    });
  }, [metrics, searchQuery, statusFilter]);

  // Prepare chart data (medicines that have non-zero usage)
  const chartData = useMemo(() => {
    return fastMovingMedicines.slice(0, 10).map((m) => ({
      name: m.medicineName.length > 18 ? m.medicineName.substring(0, 16) + '...' : m.medicineName,
      fullName: m.medicineName,
      units: m.totalUnitsUsed,
      avgDaily: m.avgDailyUsage,
      classification: m.classification,
    }));
  }, [fastMovingMedicines]);

  // Palette for chart bars based on dynamic usage classification
  const getBarColor = (classification: string) => {
    if (classification === 'HIGH USAGE') return '#0d9488'; // teal-600
    if (classification === 'MODERATE') return '#6366f1'; // indigo-500
    return '#94a3b8'; // slate-400
  };

  const hasDispensingHistory = fastMovingMedicines.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Period Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Usage Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Live Analytics
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze real-world dispensing consumption velocity, demand shifts, and intelligent replenishment forecasts.
          </p>
        </div>

        {/* Period Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setPeriodFilter('7d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              periodFilter === '7d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setPeriodFilter('30d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              periodFilter === '30d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setPeriodFilter('60d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              periodFilter === '60d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 60 days
          </button>
          <button
            onClick={() => setPeriodFilter('90d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              periodFilter === '90d'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 90 days
          </button>
          <button
            onClick={() => setPeriodFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              periodFilter === 'custom'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Custom range
          </button>
        </div>
      </div>

      {/* Custom Date Range Selector (if selected) */}
      {periodFilter === 'custom' && (
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <span className="text-slate-500 dark:text-slate-400">
            Analyzing {periodConfig.daysCount} days
          </span>
        </div>
      )}

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Units Dispensed
            </span>
            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {totalDispensedInPeriod}
            </span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across {totalTransactionsInPeriod} dispensing transactions
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Fast-Moving Medicines
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {fastMovingMedicines.length}
            </span>
            <span className="text-xs text-slate-500">items active</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {highUsageCount} classified as High Usage
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              High Usage Tier
            </span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {highUsageCount}
            </span>
            <span className="text-xs text-slate-500">medicines</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Highest relative consumption velocity
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Urgent Reorder Reviews
            </span>
            <span
              className={`p-2 rounded-xl ${
                urgentReorderCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${
                urgentReorderCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {urgentReorderCount}
            </span>
            <span className="text-xs text-slate-500">alerts</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {urgentReorderCount > 0 ? 'High usage + depleted stock' : 'No critical shortages'}
          </div>
        </div>
      </div>

      {/* Urgent Reorder Review & Critical Usage Alerts */}
      {usageAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Usage Intelligence Alerts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usageAlerts.map((alert, idx) => {
              const isUrgent = alert.type === 'urgent_reorder';
              const m = alert.medicine;
              return (
                <div
                  key={`${alert.type}-${m.medicineId}-${idx}`}
                  className={`p-5 rounded-2xl border transition-all ${
                    isUrgent
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                      : alert.type === 'high_usage'
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-200'
                            : alert.type === 'high_usage'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/80 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200'
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : alert.type === 'high_usage' ? (
                          <Activity className="w-5 h-5" />
                        ) : (
                          <TrendingUp className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isUrgent
                                ? 'bg-rose-600 text-white'
                                : alert.type === 'high_usage'
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isUrgent ? 'URGENT REORDER REVIEW' : alert.title}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                          {m.medicineName}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {alert.message}
                        </p>

                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <div>
                            <span className="text-slate-400 block">Total Used</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {m.totalUnitsUsed} {m.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Average Daily</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {m.avgDailyUsage} /day
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Current Stock</span>
                            <span
                              className={`font-bold ${
                                m.currentStock <= m.minStockLevel
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {m.currentStock} {m.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Estimated Stock</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {m.estimatedDaysRemaining !== null ? `${m.estimatedDaysRemaining} days` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            <span className="font-bold text-slate-900 dark:text-white">Recommendation: </span>
                            {alert.recommendation}
                          </p>

                          <button
                            onClick={() => onOpenAddBatch(m.medicineId)}
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            + Receive Stock
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 italic mt-2">
                          Note: Suggested reorder quantity is a system recommendation, not an automatic purchase.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Usage Analytics Chart (Medicine Usage: X-axis medicine, Y-axis units) */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Medicine Usage (Units Dispensed)</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {periodConfig.daysCount} Days Window
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Computed strictly from actual database dispensing history.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-teal-600 inline-block"></span>
              <span className="text-slate-600 dark:text-slate-400">High Usage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block"></span>
              <span className="text-slate-600 dark:text-slate-400">Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-400 inline-block"></span>
              <span className="text-slate-600 dark:text-slate-400">Low</span>
            </div>
          </div>
        </div>

        {!hasDispensingHistory ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <Activity className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No dispensing data available yet.
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Usage insights will appear after medicines are dispensed.
            </p>
            {medicines.length > 0 && (
              <button
                onClick={() => onOpenDispense()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Dispense Medicine (FEFO)
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-800">
                          <p className="font-bold text-sm mb-1">{d.fullName}</p>
                          <p className="text-teal-400">
                            Units Dispensed: <span className="font-bold">{d.units}</span>
                          </p>
                          <p className="text-slate-300">
                            Avg Daily Usage: <span className="font-bold">{d.avgDaily} /day</span>
                          </p>
                          <p className="text-slate-400 text-[10px] mt-1">
                            Classification: <span className="text-white font-semibold">{d.classification}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="units" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.classification)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Fast-Moving Medicines & Comprehensive Intelligence Table */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Fast-Moving Medicines & Stock Intelligence
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked dynamically by units consumed. Click any medicine to open its clinical history and demand graph.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter medicine..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 w-44 focus:w-56 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('URGENT')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'URGENT'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Urgent ({urgentReorderCount})
              </button>
              <button
                onClick={() => setStatusFilter('HIGH')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'HIGH'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                High Usage
              </button>
            </div>
          </div>
        </div>

        {filteredMetrics.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching medicines found.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Adjust your search or filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Medicine</th>
                  <th className="py-3 px-3">Units Used</th>
                  <th className="py-3 px-3">Avg Daily</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-3">Days Remaining</th>
                  <th className="py-3 px-3">Trend vs Prev Period</th>
                  <th className="py-3 px-3">Status Badge</th>
                  <th className="py-3 px-3">Suggested Reorder (Rec.)</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredMetrics.map((m) => {
                  const isUrgent = m.isUrgentReorder;
                  const rawMed = medicines.find((x) => x.id === m.medicineId);

                  return (
                    <tr
                      key={m.medicineId}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        isUrgent ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Medicine Info */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => rawMed && onViewMedicine(rawMed)}
                          className="text-left font-bold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                        >
                          {m.medicineName}
                        </button>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {m.genericName || m.category || 'Clinical item'}
                        </div>
                      </td>

                      {/* Units Used */}
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {m.totalUnitsUsed} <span className="font-normal text-slate-400">{m.unit}</span>
                      </td>

                      {/* Avg Daily Usage */}
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {m.avgDailyUsage} <span className="text-[10px] text-slate-400">/day</span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            m.currentStock <= m.minStockLevel
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {m.currentStock}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">(min: {m.minStockLevel})</span>
                      </td>

                      {/* Days Remaining */}
                      <td className="py-3 px-3">
                        {m.estimatedDaysRemaining !== null ? (
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                              m.estimatedDaysRemaining <= 7
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold'
                                : m.estimatedDaysRemaining <= 14
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {m.estimatedDaysRemaining} days
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No recent usage data</span>
                        )}
                      </td>

                      {/* Trend */}
                      <td className="py-3 px-3">
                        {m.trendDirection === 'increasing' && m.usageChangePercent !== null ? (
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <ArrowUpRight className="w-4 h-4" />
                            +{m.usageChangePercent}%
                          </div>
                        ) : m.trendDirection === 'decreasing' && m.usageChangePercent !== null ? (
                          <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                            <ArrowDownRight className="w-4 h-4" />
                            {m.usageChangePercent}%
                          </div>
                        ) : m.trendDirection === 'increasing' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                            New usage (+{m.totalUnitsUsed})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No history</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                            m.classification === 'HIGH USAGE'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                              : m.classification === 'MODERATE'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : m.classification === 'LOW USAGE'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          }`}
                        >
                          {m.classification}
                        </span>
                      </td>

                      {/* Suggested Reorder Quantity */}
                      <td className="py-3 px-3">
                        {m.suggestedReorderQuantity > 0 ? (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {m.suggestedReorderQuantity} {m.unit}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              Lead demand: ~{m.demandDuringLeadTime} ({m.supplierLeadTimeDays}d)
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                            Adequate stock
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {m.currentStock > 0 && (
                            <button
                              onClick={() => onOpenDispense(m.medicineId)}
                              className="p-1.5 rounded-lg border border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-[11px] font-medium transition-colors"
                              title="Dispense this medicine"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenAddBatch(m.medicineId)}
                            className="p-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-[11px] font-medium transition-colors"
                            title="Receive batch"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
