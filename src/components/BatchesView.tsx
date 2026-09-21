import React, { useState, useMemo } from 'react';
import { Box, Plus, Search, Filter, AlertTriangle, Clock, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { Batch, Medicine, Supplier } from '../types';
import { getExpiryStatus, sortBatchesFEFO } from '../utils/fefo';
import { EmptyState } from './EmptyState';

interface BatchesViewProps {
  batches: Batch[];
  medicines: Medicine[];
  suppliers: Supplier[];
  onOpenAddBatch: (medicineId?: string) => void;
  onDeleteBatch: (batchId: string) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  medicines,
  suppliers,
  onOpenAddBatch,
  onDeleteBatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sorted strictly by FEFO (earliest expiry first)
  const fefoBatches = useMemo(() => {
    return sortBatchesFEFO(batches);
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return fefoBatches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.medicineName.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter !== 'ALL') {
        const exp = getExpiryStatus(b.expiryDate);
        if (statusFilter !== exp.status) return false;
      }

      return true;
    });
  }, [fefoBatches, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Medicine Batches & FEFO Tracking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Batches are automatically ranked by First-Expired, First-Out (FEFO) to safeguard potency.
          </p>
        </div>

        <button
          id="batches-page-add-batch-btn"
          onClick={() => onOpenAddBatch()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-700/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Add Batch
        </button>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          type="batches"
          onAction={() => onOpenAddBatch()}
          customTitle="No medicine batches available."
          customDescription="Click '+ Add Batch' to register batch numbers, quantities, manufacturing dates, and expiry dates."
          actionLabel="+ Add Batch"
        />
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="search-batches-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch number, medicine name, supplier..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                id="filter-batch-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Expiry Statuses ({batches.length})</option>
                <option value="CRITICAL">Critical (&le; 30 Days Left)</option>
                <option value="NEAR_EXPIRY">Near Expiry (&le; 90 Days Left)</option>
                <option value="EXPIRED">Expired</option>
                <option value="GOOD">Good / Valid (&gt; 90 Days)</option>
              </select>
            </div>
          </div>

          {/* Batches Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">FEFO Rank</th>
                    <th className="py-3 px-4">Batch No</th>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Available Qty</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Expiry Status</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Pricing</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredBatches.map((b, idx) => {
                    const exp = getExpiryStatus(b.expiryDate);
                    const isExpired = exp.status === 'EXPIRED';

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                          isExpired ? 'opacity-65 bg-rose-50/30' : ''
                        }`}
                      >
                        {/* FEFO Priority Rank */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                            #{idx + 1}
                          </span>
                        </td>

                        {/* Batch Number */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {b.batchNumber}
                          </span>
                          {b.manufacturingDate && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              Mfg: {b.manufacturingDate}
                            </span>
                          )}
                        </td>

                        {/* Medicine */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {b.medicineName}
                          </span>
                        </td>

                        {/* Available Qty */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {b.quantity}
                          </span>
                          <span className="text-slate-400 ml-1 text-[11px]">
                            / {b.initialQuantity}
                          </span>
                        </td>

                        {/* Expiry Date */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {b.expiryDate}
                        </td>

                        {/* Expiry Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10px] border ${exp.badgeClass}`}>
                            {exp.label}
                          </span>
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {b.supplierName || '—'}
                        </td>

                        {/* Pricing */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          <div>Buy: ${b.purchasePrice !== undefined ? b.purchasePrice.toFixed(2) : '—'}</div>
                          <div>Sell: ${b.sellingPrice !== undefined ? b.sellingPrice.toFixed(2) : '—'}</div>
                        </td>

                        {/* Delete action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`Remove batch "${b.batchNumber}"?`)) {
                                onDeleteBatch(b.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove Batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
