import React from 'react';
import { TrendingUp, AlertTriangle, ArrowRight, Activity, Zap } from 'lucide-react';
import { Medicine, MedicineUsageMetrics } from '../types';

interface FastMovingMedicinesCardProps {
  metrics: MedicineUsageMetrics[];
  onViewAllUsage: () => void;
  onViewMedicine?: (medicine: Medicine) => void;
  medicines?: Medicine[];
  daysCount?: number;
}

export const FastMovingMedicinesCard: React.FC<FastMovingMedicinesCardProps> = ({
  metrics,
  onViewAllUsage,
  onViewMedicine,
  medicines = [],
  daysCount = 30,
}) => {
  // Only medicines with actual usage
  const activeUsage = metrics.filter((m) => m.totalUnitsUsed > 0);

  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Fast-Moving Medicines</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Last {daysCount} Days
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ranked by actual dispensing volume from transaction history.
            </p>
          </div>
        </div>

        {activeUsage.length > 0 && (
          <button
            onClick={onViewAllUsage}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors cursor-pointer"
          >
            Usage Intelligence
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeUsage.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <Activity className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No dispensing data available yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Usage insights will appear after medicines are dispensed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Medicine</th>
                <th className="py-2.5 px-3">Units Used</th>
                <th className="py-2.5 px-3">Avg Daily</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3">Days Remaining</th>
                <th className="py-2.5 px-3">Trend</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {activeUsage.slice(0, 5).map((m) => {
                const isUrgent = m.isUrgentReorder;
                return (
                  <tr
                    key={m.medicineId}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      isUrgent ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                    }`}
                    onClick={() => {
                      if (onViewMedicine) {
                        const med = medicines.find((x) => x.id === m.medicineId);
                        if (med) onViewMedicine(med);
                      }
                    }}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {m.medicineName}
                      </div>
                      {m.category && (
                        <div className="text-[10px] text-slate-400">{m.category}</div>
                      )}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {m.totalUnitsUsed} <span className="font-normal text-slate-400">{m.unit}</span>
                    </td>

                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {m.avgDailyUsage} <span className="text-slate-400 text-[10px]">/day</span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          m.currentStock <= m.minStockLevel
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {m.currentStock}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">(min: {m.minStockLevel})</span>
                    </td>

                    <td className="py-3 px-3">
                      {m.estimatedDaysRemaining !== null ? (
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                            m.estimatedDaysRemaining <= 7
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : m.estimatedDaysRemaining <= 14
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {m.estimatedDaysRemaining} days
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No recent usage data</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {m.trendDirection === 'increasing' && m.usageChangePercent !== null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{m.usageChangePercent}%
                        </span>
                      ) : m.trendDirection === 'decreasing' && m.usageChangePercent !== null ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                          <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                          {m.usageChangePercent}%
                        </span>
                      ) : m.trendDirection === 'increasing' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          New usage
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          m.classification === 'HIGH USAGE'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            : m.classification === 'MODERATE'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : m.classification === 'LOW USAGE'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}
                      >
                        {m.classification}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
