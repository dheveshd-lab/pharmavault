import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  BarChart3,
  ShieldAlert,
  Clock,
  Layers,
  CheckCircle2,
  HelpCircle,
  PackageSearch,
  Truck,
  ArrowRight,
  Info,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Batch, DispensingRecord, Medicine, SalesBill, Supplier, UserProfile } from '../types';
import {
  calculateSeasonalAnalytics,
  MedicineSeasonalAnalysis,
  SeasonalFilterPeriod,
} from '../utils/seasonalAnalytics';

interface SeasonalAnalyticsViewProps {
  medicines: Medicine[];
  batches: Batch[];
  dispensingRecords: DispensingRecord[];
  salesBills: SalesBill[];
  suppliers: Supplier[];
  profile?: UserProfile | null;
  onOpenDispense?: (medicineId?: string) => void;
  onOpenAddBatch?: (medicineId?: string) => void;
}

export const SeasonalAnalyticsView: React.FC<SeasonalAnalyticsViewProps> = ({
  medicines = [],
  batches = [],
  dispensingRecords = [],
  salesBills = [],
  suppliers = [],
  profile,
  onOpenDispense,
  onOpenAddBatch,
}) => {
  const [periodFilter, setPeriodFilter] = useState<SeasonalFilterPeriod>('12m');
  const [selectedMedId, setSelectedMedId] = useState<string>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const currencySymbol =
    profile?.currency === 'USD'
      ? '$'
      : profile?.currency === 'EUR'
      ? '€'
      : profile?.currency === 'GBP'
      ? '£'
      : '₹';

  // Perform analytics calculation
  const analytics = useMemo(() => {
    return calculateSeasonalAnalytics(
      medicines,
      batches,
      dispensingRecords,
      salesBills,
      suppliers,
      periodFilter,
      periodFilter === 'custom' ? { start: customStart, end: customEnd } : undefined
    );
  }, [medicines, batches, dispensingRecords, salesBills, suppliers, periodFilter, customStart, customEnd]);

  // Selected single medicine analysis if chosen
  const singleAnalysis = useMemo(() => {
    if (selectedMedId === 'ALL') return null;
    return analytics.medicinesAnalysis.find((m) => m.medicineId === selectedMedId) || null;
  }, [analytics.medicinesAnalysis, selectedMedId]);

  // Chart data: overall or single medicine
  const chartData = useMemo(() => {
    if (singleAnalysis) {
      return singleAnalysis.monthlyHistory.map((m) => ({
        label: m.monthLabel,
        Dispensed: m.unitsDispensed,
        Sold: m.unitsSold,
        'Total Movement': m.totalUnitsMoved,
        Revenue: m.revenue,
      }));
    }
    return analytics.overallMonthlyTrend.map((m) => ({
      label: m.monthLabel,
      Dispensed: m.unitsDispensed,
      Sold: m.unitsSold,
      'Total Movement': m.totalUnitsMoved,
      Revenue: m.revenue,
    }));
  }, [singleAnalysis, analytics.overallMonthlyTrend]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (analytics.medicinesAnalysis.length === 0) return;
    const headers = [
      'Medicine Name',
      'Category',
      'Period Units Moved',
      'Units Dispensed',
      'Units Sold',
      'Revenue',
      'Month-over-Month Change %',
      'Peak Month',
      'Seasonal Classification',
      'Forecast (Next 30d)',
      'Current Eligible Stock',
      'Days of Coverage',
      'Reorder Review Status',
    ];

    const rows = analytics.medicinesAnalysis.map((m) => [
      `"${m.medicineName}"`,
      `"${m.category}"`,
      m.totalPeriodUnits,
      m.monthlyHistory.reduce((s, p) => s + p.unitsDispensed, 0),
      m.monthlyHistory.reduce((s, p) => s + p.unitsSold, 0),
      m.totalPeriodRevenue.toFixed(2),
      m.monthOverMonthChangePercent !== null ? `${m.monthOverMonthChangePercent}%` : 'N/A',
      `"${m.peakMonthLabel || 'N/A'}"`,
      `"${m.classification}"`,
      m.forecastedDemandNext30d !== null ? m.forecastedDemandNext30d : 'N/A',
      m.currentEligibleStock,
      m.estimatedStockCoverageDays !== null ? `${m.estimatedStockCoverageDays} days` : 'N/A',
      m.reorderReviewRequired ? 'Review Required' : 'Adequate',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pharmavault_seasonal_analytics_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Seasonal Analytics & Demand Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Explainable demand forecasting, multi-year recurring patterns, and lead-time buffer analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter Buttons */}
          <div className="inline-flex flex-wrap rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-xs">
            {(
              [
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: '6m', label: '6M' },
                { id: '12m', label: '12M' },
                { id: 'current_year', label: 'This Year' },
                { id: 'previous_year', label: 'Last Year' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPeriodFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  periodFilter === btn.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Seasonal Alerts Banner (When data indicates notable changes) */}
      {analytics.seasonalAlerts.length > 0 && (
        <div className="space-y-2">
          {analytics.seasonalAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                alert.type === 'danger'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="flex-1">
                <span className="font-bold">{alert.medicineName}: </span>
                <span>{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medicine Filter & Trend Visualization */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              {singleAnalysis ? `${singleAnalysis.medicineName} Usage & Revenue Trend` : 'Aggregate Monthly Pharmaceutical Demand'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Distinguishes clinical dispensary units, retail sales, and sales revenue without duplication.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Focus:</label>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">All Medicines (Aggregated)</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.dosageForm})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="h-72 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No transaction or dispensing records recorded for this timeframe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMovement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="Total Movement"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="urlColorMovement"
                  name="Units Dispensed & Sold"
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="urlColorRevenue"
                  name={`Revenue (${currencySymbol})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Selected Medicine Deep Dive Card (When single medicine selected) */}
        {singleAnalysis && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Seasonal Pattern</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 mt-0.5 block">
                {singleAnalysis.classification}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                {singleAnalysis.classificationReason}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Forecast (Next 30D)</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {singleAnalysis.forecastedDemandNext30d !== null
                  ? `${singleAnalysis.forecastedDemandNext30d} units`
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Method: {singleAnalysis.forecastMethod}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stock Coverage</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {singleAnalysis.estimatedStockCoverageDays !== null
                  ? `${singleAnalysis.estimatedStockCoverageDays} days remaining`
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Eligible stock: {singleAnalysis.currentEligibleStock} units
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Supplier Lead Buffer</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {singleAnalysis.demandDuringLeadTime} units / {singleAnalysis.supplierLeadTimeDays}d
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Supplier: {singleAnalysis.preferredSupplier?.name || 'Standard Distribution'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Seasonal Classification Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            Seasonal Classification & Reorder Reviews
          </h2>
          <span className="text-xs text-slate-400">
            {analytics.medicinesAnalysis.length} medicines analyzed
          </span>
        </div>

        {analytics.medicinesAnalysis.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No medicines in inventory catalog yet. Add medicines to view seasonal intelligence.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Medicine</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Units Moved</th>
                  <th className="py-3 px-3 text-right">MoM Change</th>
                  <th className="py-3 px-3">Pattern Classification</th>
                  <th className="py-3 px-3 text-right">Stock / Coverage</th>
                  <th className="py-3 px-3 text-right">30D Forecast</th>
                  <th className="py-3 px-3 text-center">Reorder Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {analytics.medicinesAnalysis.map((med) => (
                  <tr key={med.medicineId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                      {med.medicineName}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{med.category}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                      {med.totalPeriodUnits}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {med.monthOverMonthChangePercent !== null ? (
                        <span
                          className={
                            med.monthOverMonthChangePercent > 0
                              ? 'text-teal-600 dark:text-teal-400'
                              : med.monthOverMonthChangePercent < 0
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }
                        >
                          {med.monthOverMonthChangePercent > 0 ? '+' : ''}
                          {med.monthOverMonthChangePercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          med.classification === 'Increasing usage'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : med.classification === 'Potential seasonal demand'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                            : med.classification === 'Decreasing usage'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {med.classification}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {med.currentEligibleStock} units
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {med.estimatedStockCoverageDays !== null
                          ? `${med.estimatedStockCoverageDays}d coverage`
                          : 'No demand'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">
                      {med.forecastedDemandNext30d !== null
                        ? `${med.forecastedDemandNext30d}u`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {med.reorderReviewRequired ? (
                        <button
                          onClick={() => onOpenAddBatch && onOpenAddBatch(med.medicineId)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          Order +{med.reorderRecommendedQuantity}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
