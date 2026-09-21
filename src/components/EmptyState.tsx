import React from 'react';
import { Pill, Box, Truck, ReceiptText, CheckCircle2, Plus } from 'lucide-react';

interface EmptyStateProps {
  type: 'medicines' | 'batches' | 'suppliers' | 'dispensing' | 'reorder' | 'charts';
  onAction?: () => void;
  actionLabel?: string;
  customTitle?: string;
  customDescription?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onAction,
  actionLabel,
  customTitle,
  customDescription,
}) => {
  if (type === 'medicines') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <Pill className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {customTitle || 'No medicines added yet.'}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          {customDescription || 'Start by adding your first medicine to begin managing your inventory.'}
        </p>
        {onAction && (
          <button
            id="empty-state-add-medicine-btn"
            onClick={onAction}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-medium shadow-sm shadow-teal-700/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {actionLabel || '+ Add Medicine'}
          </button>
        )}
      </div>
    );
  }

  if (type === 'batches') {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
        <div className="w-14 h-14 mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Box className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {customTitle || 'No medicine batches available.'}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {customDescription || 'Batches track manufacturing dates, expiry dates, FEFO rotation, and quantity.'}
        </p>
        {onAction && (
          <button
            id="empty-state-add-batch-btn"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {actionLabel || '+ Add Batch'}
          </button>
        )}
      </div>
    );
  }

  if (type === 'suppliers') {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
        <div className="w-14 h-14 mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Truck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {customTitle || 'No suppliers added yet.'}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {customDescription || 'Register pharmaceutical suppliers to link them with incoming batches and track lead times.'}
        </p>
        {onAction && (
          <button
            id="empty-state-add-supplier-btn"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {actionLabel || '+ Add Supplier'}
          </button>
        )}
      </div>
    );
  }

  if (type === 'dispensing') {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="w-14 h-14 mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <ReceiptText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {customTitle || 'No dispensing records yet.'}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {customDescription || 'Dispense medicines using automatic FEFO batch allocation to keep an audit trail of prescription fulfillments.'}
        </p>
      </div>
    );
  }

  if (type === 'reorder') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
        <div className="w-12 h-12 mb-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {customTitle || 'No reorder recommendations currently available.'}
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
          {customDescription || 'All active medicines have sufficient stock above their minimum threshold, or no medicines are registered.'}
        </p>
      </div>
    );
  }

  // charts
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        No inventory data available for charts
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Add medicines and batches to generate analytics and expiry breakdown.
      </p>
    </div>
  );
};
