import React, { useState, useMemo } from 'react';
import { ReceiptText, Search, Send, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import { DispensingRecord } from '../types';
import { EmptyState } from './EmptyState';

interface DispensingHistoryViewProps {
  records: DispensingRecord[];
  onOpenDispense: () => void;
  hasMedicinesWithStock: boolean;
}

export const DispensingHistoryView: React.FC<DispensingHistoryViewProps> = ({
  records,
  onOpenDispense,
  hasMedicinesWithStock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sortedRecords = useMemo(() => {
    return [...records].sort(
      (a, b) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime()
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    return sortedRecords.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        r.medicineName.toLowerCase().includes(q) ||
        (r.patientName && r.patientName.toLowerCase().includes(q)) ||
        (r.prescriptionNumber && r.prescriptionNumber.toLowerCase().includes(q)) ||
        (r.prescribedBy && r.prescribedBy.toLowerCase().includes(q)) ||
        r.batchAllocations.some((ba) => ba.batchNumber.toLowerCase().includes(q))
      );
    });
  }, [sortedRecords, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dispensing History & Audit Log
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit trail of prescription fulfillment and FEFO batch deductions.
          </p>
        </div>

        {hasMedicinesWithStock && (
          <button
            id="dispensing-page-dispense-btn"
            onClick={onOpenDispense}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm shadow-md shadow-teal-700/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            + New Dispensing
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <EmptyState
          type="dispensing"
          customTitle="No dispensing records yet."
          customDescription="When medicines are dispensed using FEFO allocation, full prescription details and batch deduction logs appear here."
        />
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="search-dispensing-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by medicine, patient, Rx #, doctor..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">FEFO Batch Allocation Breakdown</th>
                    <th className="py-3 px-4">Patient / Rx</th>
                    <th className="py-3 px-4">Instructions</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredRecords.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {new Date(r.dispensedAt).toLocaleDateString()}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(r.dispensedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Medicine */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {r.medicineName}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sm text-teal-700 dark:text-teal-400">
                          {r.quantity}
                        </span>
                      </td>

                      {/* FEFO Batch breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {r.batchAllocations.map((alloc) => (
                            <div
                              key={alloc.batchId}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-[11px] mr-1.5 text-teal-900 dark:text-teal-200 font-medium"
                            >
                              <span className="font-semibold font-mono">
                                {alloc.batchNumber}
                              </span>
                              <span className="text-teal-600 dark:text-teal-400">
                                ({alloc.quantity} units, exp: {alloc.expiryDate})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Patient / Rx info */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {r.patientName && (
                          <div className="font-medium text-slate-900 dark:text-white">
                            {r.patientName}
                          </div>
                        )}
                        {r.prescriptionNumber && (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Rx: {r.prescriptionNumber}
                          </span>
                        )}
                        {r.prescribedBy && (
                          <span className="text-[11px] text-slate-400 block">
                            By: {r.prescribedBy}
                          </span>
                        )}
                        {!r.patientName && !r.prescriptionNumber && !r.prescribedBy && (
                          <span className="text-slate-400 italic">OTC / Walk-in</span>
                        )}
                      </td>

                      {/* Directions */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {r.notes || '—'}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                        {r.totalAmount !== undefined ? `$${r.totalAmount.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
