import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Boxes,
  Truck,
  TrendingUp,
  ShieldAlert,
  Send,
  Plus,
  CheckCircle2,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { Batch, DispensingRecord, Medicine, Supplier } from '../types';
import { getDaysUntil, getExpiryStatus, getMedicineInventory } from '../utils/fefo';

interface AlertsViewProps {
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  dispensingRecords: DispensingRecord[];
  onOpenDispense?: (medicineId?: string) => void;
  onOpenAddBatch?: (medicineId?: string) => void;
}

export interface SystemAlertItem {
  id: string;
  category: 'EXPIRY' | 'STOCKOUT' | 'LEAD_TIME' | 'SURGE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  medicineId?: string;
  medicineName?: string;
  batchId?: string;
  batchNumber?: string;
  actionType?: 'dispense' | 'add_batch';
  actionLabel?: string;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  medicines = [],
  batches = [],
  suppliers = [],
  dispensingRecords = [],
  onOpenDispense,
  onOpenAddBatch,
}) => {
  const alerts = useMemo(() => {
    const list: SystemAlertItem[] = [];

    // 1. Expiry alerts
    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const days = getDaysUntil(b.expiryDate);
      if (days < 0) {
        list.push({
          id: `exp-expired-${b.id}`,
          category: 'EXPIRY',
          severity: 'CRITICAL',
          title: `Expired Stock: Batch ${b.batchNumber}`,
          description: `${b.medicineName} (expired ${Math.abs(days)} days ago, ${b.quantity} units). Remove from active dispensing queue immediately.`,
          medicineId: b.medicineId,
          medicineName: b.medicineName,
          batchId: b.id,
          batchNumber: b.batchNumber,
        });
      } else if (days <= 30) {
        list.push({
          id: `exp-critical-${b.id}`,
          category: 'EXPIRY',
          severity: 'CRITICAL',
          title: `Critical Expiry in ${days} Days: Batch ${b.batchNumber}`,
          description: `${b.medicineName} expires on ${b.expiryDate}. ${b.quantity} units remaining in vault.`,
          medicineId: b.medicineId,
          medicineName: b.medicineName,
          batchId: b.id,
          batchNumber: b.batchNumber,
          actionType: 'dispense',
          actionLabel: 'Dispense First (FEFO)',
        });
      } else if (days <= 90) {
        list.push({
          id: `exp-near-${b.id}`,
          category: 'EXPIRY',
          severity: 'WARNING',
          title: `Near Expiry in ${days} Days: Batch ${b.batchNumber}`,
          description: `${b.medicineName} expires on ${b.expiryDate} (${b.quantity} units).`,
          medicineId: b.medicineId,
          medicineName: b.medicineName,
          batchId: b.id,
          batchNumber: b.batchNumber,
        });
      }
    }

    // 2. Stockout & Low Stock alerts
    for (const med of medicines) {
      const inv = getMedicineInventory(med.id, batches);
      if (inv.availableUnits === 0) {
        list.push({
          id: `stock-out-${med.id}`,
          category: 'STOCKOUT',
          severity: 'CRITICAL',
          title: `Zero Stock: ${med.name}`,
          description: `No eligible non-expired units available. Minimum stock threshold is ${med.minStockLevel} units.`,
          medicineId: med.id,
          medicineName: med.name,
          actionType: 'add_batch',
          actionLabel: '+ Reorder Batch',
        });
      } else if (inv.availableUnits < med.minStockLevel) {
        list.push({
          id: `stock-low-${med.id}`,
          category: 'STOCKOUT',
          severity: 'WARNING',
          title: `Low Stock Deficit: ${med.name}`,
          description: `Current available stock (${inv.availableUnits} units) is below safety buffer (${med.minStockLevel} units).`,
          medicineId: med.id,
          medicineName: med.name,
          actionType: 'add_batch',
          actionLabel: '+ Add Batch',
        });
      }
    }

    return list;
  }, [medicines, batches]);

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Clinical Alerts & Risk Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Proactive alerts for expired lots, critical FEFO windows, and minimum stock deficits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {criticalCount} Critical
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {warningCount} Warnings
          </span>
        </div>
      </div>

      {/* Alerts Grid */}
      {alerts.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            All Systems Normal — No Active Alerts
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your pharmaceutical inventory has no critical expirations, zero-stock deficits, or quarantine notices.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                  }`}
                >
                  {alert.category === 'EXPIRY' ? (
                    <Clock className="w-5 h-5" />
                  ) : alert.category === 'STOCKOUT' ? (
                    <Boxes className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {alert.title}
                    </h3>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {alert.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {alert.actionType && (
                <div className="shrink-0 self-end sm:self-center">
                  {alert.actionType === 'dispense' && onOpenDispense && (
                    <button
                      onClick={() => onOpenDispense(alert.medicineId)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {alert.actionLabel || 'Dispense'}
                    </button>
                  )}

                  {alert.actionType === 'add_batch' && onOpenAddBatch && (
                    <button
                      onClick={() => onOpenAddBatch(alert.medicineId)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {alert.actionLabel || 'Add Batch'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
