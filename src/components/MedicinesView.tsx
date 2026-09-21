import React, { useState, useMemo } from 'react';
import { Pill, Plus, Search, Filter, Box, Send, Edit3, Trash2, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';
import { Batch, Medicine } from '../types';
import { getExpiryStatus, getMedicineInventory } from '../utils/fefo';
import { EmptyState } from './EmptyState';

interface MedicinesViewProps {
  medicines: Medicine[];
  batches: Batch[];
  onOpenAddMedicine: () => void;
  onOpenAddBatch: (medicineId: string) => void;
  onOpenDispense: (medicineId: string) => void;
  onViewMedicine: (medicine: Medicine) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicineId: string) => void;
}

export const MedicinesView: React.FC<MedicinesViewProps> = ({
  medicines,
  batches,
  onOpenAddMedicine,
  onOpenAddBatch,
  onOpenDispense,
  onViewMedicine,
  onEditMedicine,
  onDeleteMedicine,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<string>('ALL');

  // Categories present in the registered medicines
  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => set.add(m.category));
    return Array.from(set).sort();
  }, [medicines]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q) ||
        m.dosageForm.toLowerCase().includes(q) ||
        (m.strength && m.strength.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (stockFilter !== 'ALL') {
        const inv = getMedicineInventory(m.id, batches);
        if (stockFilter === 'LOW') {
          return inv.availableUnits <= m.minStockLevel && inv.availableUnits > 0;
        }
        if (stockFilter === 'OUT') {
          return inv.availableUnits === 0;
        }
        if (stockFilter === 'OPTIMAL') {
          return inv.availableUnits > m.minStockLevel;
        }
      }

      return true;
    });
  }, [medicines, batches, searchQuery, selectedCategory, stockFilter]);

  return (
    <div className="space-y-6">
      {/* Header with prominent + Add Medicine button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Medicine Inventory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage pharmaceutical catalog, dosage forms, safety thresholds, and batch tracking.
          </p>
        </div>

        {/* PROMINENT + Add Medicine button as requested */}
        <button
          id="prominent-add-medicine-btn"
          onClick={onOpenAddMedicine}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm shadow-md shadow-teal-700/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Add Medicine
        </button>
      </div>

      {medicines.length === 0 ? (
        <EmptyState
          type="medicines"
          onAction={onOpenAddMedicine}
          customTitle="No medicines added yet."
          customDescription="Start by adding your first medicine to begin managing your inventory."
          actionLabel="+ Add Medicine"
        />
      ) : (
        <div className="space-y-4">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="search-medicines-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by brand name, generic formulation, category..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                id="filter-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Categories ({medicines.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                id="filter-stock-select"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="LOW">Low Stock (At/Below Min)</option>
                <option value="OUT">Out of Stock</option>
                <option value="OPTIMAL">Optimal Stock</option>
              </select>
            </div>
          </div>

          {/* Medicines Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Medicine & Generic</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Form & Strength</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Min Stock</th>
                    <th className="py-3 px-4">Batches</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredMedicines.map((m) => {
                    const inv = getMedicineInventory(m.id, batches);
                    const isOutOfStock = inv.availableUnits === 0;
                    const isLowStock = inv.availableUnits <= m.minStockLevel && !isOutOfStock;

                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Medicine Name */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => onViewMedicine(m)}
                            className="text-left font-bold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 block transition-colors cursor-pointer"
                          >
                            {m.name}
                          </button>
                          {m.genericName && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {m.genericName}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                            {m.category}
                          </span>
                        </td>

                        {/* Form & Strength */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{m.dosageForm}</span>
                          {m.strength && (
                            <span className="text-slate-400 block text-[11px]">
                              {m.strength}
                            </span>
                          )}
                        </td>

                        {/* Available Stock */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold text-sm ${
                                isOutOfStock
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {inv.availableUnits}
                            </span>
                            <span className="text-slate-400 text-[11px]">{m.unit || 'units'}</span>
                          </div>
                          {isOutOfStock ? (
                            <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Out of stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" /> Normal
                            </span>
                          )}
                        </td>

                        {/* Min Stock */}
                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          {m.minStockLevel}
                        </td>

                        {/* Batches count */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {inv.activeBatchesCount} active
                          </span>
                          {inv.earliestExpiryDate && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              Next: {inv.earliestExpiryDate}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              m.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View details */}
                            <button
                              onClick={() => onViewMedicine(m)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="View Details & FEFO Batches"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Add batch directly */}
                            <button
                              onClick={() => onOpenAddBatch(m.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Add Batch for this medicine"
                            >
                              <Plus className="w-3 h-3" />
                              Batch
                            </button>

                            {/* Dispense directly if available stock */}
                            {inv.availableUnits > 0 && (
                              <button
                                onClick={() => onOpenDispense(m.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Dispense this medicine"
                              >
                                <Send className="w-3 h-3" />
                                Dispense
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => onEditMedicine(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Medicine"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete "${m.name}"? All associated batches will also be deleted.`
                                  )
                                ) {
                                  onDeleteMedicine(m.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Medicine"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
