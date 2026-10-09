import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Send,
  Calendar,
  Filter,
  Search,
  Download,
  ShieldAlert,
  Boxes,
} from 'lucide-react';
import { Batch, Medicine, Supplier } from '../types';
import { getDaysUntil, getExpiryStatus, sortBatchesFEFO } from '../utils/fefo';

interface ExpiryManagementViewProps {
  batches: Batch[];
  medicines: Medicine[];
  suppliers: Supplier[];
  onOpenDispense?: (medicineId?: string) => void;
  onDeleteBatch?: (batchId: string) => void;
}

export const ExpiryManagementView: React.FC<ExpiryManagementViewProps> = ({
  batches = [],
  medicines = [],
  suppliers = [],
  onOpenDispense,
  onDeleteBatch,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'NEAR_EXPIRY' | 'EXPIRED' | 'GOOD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorted by FEFO
  const fefoBatches = useMemo(() => sortBatchesFEFO(batches), [batches]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let expiredUnits = 0;
    let expiredCount = 0;
    let criticalUnits = 0;
    let criticalCount = 0;
    let nearExpiryUnits = 0;
    let nearExpiryCount = 0;
    let goodUnits = 0;
    let goodCount = 0;

    for (const b of batches) {
      const days = getDaysUntil(b.expiryDate);
      if (days < 0) {
        expiredUnits += b.quantity;
        if (b.quantity > 0) expiredCount++;
      } else if (days <= 30) {
        criticalUnits += b.quantity;
        if (b.quantity > 0) criticalCount++;
      } else if (days <= 90) {
        nearExpiryUnits += b.quantity;
        if (b.quantity > 0) nearExpiryCount++;
      } else {
        goodUnits += b.quantity;
        if (b.quantity > 0) goodCount++;
      }
    }

    return {
      expiredUnits,
      expiredCount,
      criticalUnits,
      criticalCount,
      nearExpiryUnits,
      nearExpiryCount,
      goodUnits,
      goodCount,
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return fefoBatches.filter((b) => {
      const status = getExpiryStatus(b.expiryDate);
      if (filterType !== 'ALL' && status.status !== filterType) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.batchNumber.toLowerCase().includes(q) ||
          b.medicineName.toLowerCase().includes(q) ||
          b.supplierName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [fefoBatches, filterType, searchQuery]);

  const handleExportCSV = () => {
    if (batches.length === 0) return;
    const headers = ['Batch Number', 'Medicine Name', 'Quantity', 'Expiry Date', 'Days Remaining', 'Status', 'Supplier'];
    const rows = fefoBatches.map((b) => {
      const days = getDaysUntil(b.expiryDate);
      const status = getExpiryStatus(b.expiryDate);
      return [
        b.batchNumber,
        `"${b.medicineName}"`,
        b.quantity,
        b.expiryDate,
        days,
        status.status,
        `"${b.supplierName}"`,
      ];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmavault_expiry_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Expiry Monitoring & FEFO Protocol
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time countdown to batch expirations. Prioritize dispensary usage before potency window closes.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export Expiry Audit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterType('EXPIRED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'EXPIRED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider block">
            Expired Batches
          </span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {stats.expiredCount} batches
          </div>
          <span className="text-[10px] text-rose-500/80 font-medium">{stats.expiredUnits} units quarantine required</span>
        </div>

        <div
          onClick={() => setFilterType('CRITICAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'CRITICAL'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider block">
            Critical (≤ 30 Days)
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.criticalCount} batches
          </div>
          <span className="text-[10px] text-amber-500/80 font-medium">{stats.criticalUnits} units FEFO priority</span>
        </div>

        <div
          onClick={() => setFilterType('NEAR_EXPIRY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'NEAR_EXPIRY'
              ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider block">
            Near Expiry (31–90 Days)
          </span>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {stats.nearExpiryCount} batches
          </div>
          <span className="text-[10px] text-yellow-600/80 font-medium">{stats.nearExpiryUnits} units upcoming</span>
        </div>

        <div
          onClick={() => setFilterType('GOOD')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterType === 'GOOD'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Valid Stock (&gt; 90 Days)
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.goodCount} batches
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium">{stats.goodUnits} units fully potent</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batch number, medicine..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({batches.length})
            </button>
            <button
              onClick={() => setFilterType('CRITICAL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterType === 'CRITICAL'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Critical ({stats.criticalCount})
            </button>
            <button
              onClick={() => setFilterType('EXPIRED')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterType === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expired ({stats.expiredCount})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Batches Found for this Filter
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {filterType === 'EXPIRED'
              ? 'Excellent! No expired medicines currently in your active inventory.'
              : 'No batches match the selected criteria.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">FEFO Status</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredBatches.map((batch) => {
                  const status = getExpiryStatus(batch.expiryDate);
                  const days = getDaysUntil(batch.expiryDate);

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {batch.batchNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {batch.medicineName}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {batch.quantity}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{batch.expiryDate}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{batch.supplierName}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {days >= 0 && batch.quantity > 0 && onOpenDispense && (
                            <button
                              onClick={() => onOpenDispense(batch.medicineId)}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Dispense Batch"
                            >
                              <Send className="w-3 h-3" />
                              Dispense
                            </button>
                          )}

                          {onDeleteBatch && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove batch ${batch.batchNumber}?`)) {
                                  onDeleteBatch(batch.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete or quarantine batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
