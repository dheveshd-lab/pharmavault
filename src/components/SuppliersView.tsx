import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, Phone, Mail, MapPin, Clock, Trash2, Box } from 'lucide-react';
import { Batch, Supplier } from '../types';
import { EmptyState } from './EmptyState';

interface SuppliersViewProps {
  suppliers: Supplier[];
  batches: Batch[];
  onOpenAddSupplier: () => void;
  onDeleteSupplier: (supplierId: string) => void;
  onOpenAddBatchWithSupplier?: (supplierId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  batches,
  onOpenAddSupplier,
  onDeleteSupplier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Suppliers & Distributors
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registered pharmaceutical suppliers with lead times and procurement history.
          </p>
        </div>

        <button
          id="suppliers-page-add-supplier-btn"
          onClick={onOpenAddSupplier}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-sm shadow-md shadow-amber-700/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Add Supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          type="suppliers"
          onAction={onOpenAddSupplier}
          customTitle="No suppliers added yet."
          customDescription="Click '+ Add Supplier' to register pharmaceutical distributors, contacts, and lead times."
          actionLabel="+ Add Supplier"
        />
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="search-suppliers-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by supplier name, contact, or email..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((s) => {
              const linkedBatches = batches.filter((b) => b.supplierId === s.id);

              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {s.name}
                          </h3>
                          {s.contactPerson && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Attn: {s.contactPerson}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete supplier "${s.name}"? Existing batches will retain supplier name reference.`
                            )
                          ) {
                            onDeleteSupplier(s.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      {s.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{s.email}</span>
                        </div>
                      )}
                      {s.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{s.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{s.leadTimeDays} days lead time</span>
                    </div>

                    <span className="text-slate-400 text-[11px] font-medium">
                      {linkedBatches.length} batches delivered
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
