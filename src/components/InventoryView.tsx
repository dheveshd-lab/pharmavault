import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Send,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Batch, Medicine, UserProfile } from '../types';
import { getDaysUntil, getMedicineInventory } from '../utils/fefo';

interface InventoryViewProps {
  medicines: Medicine[];
  batches: Batch[];
  profile?: UserProfile | null;
  onOpenAddMedicine: () => void;
  onOpenAddBatch: (medicineId?: string) => void;
  onOpenDispense: (medicineId?: string) => void;
  onViewMedicine: (medicine: Medicine) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  medicines = [],
  batches = [],
  profile,
  onOpenAddMedicine,
  onOpenAddBatch,
  onOpenDispense,
  onViewMedicine,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  const currencySymbol = profile?.currency === 'USD' ? '$' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'GBP' ? '£' : '₹';

  // Calculate detailed inventory per medicine
  const inventoryList = useMemo(() => {
    return medicines.map((med) => {
      const inv = getMedicineInventory(med.id, batches);
      const medBatches = batches.filter((b) => b.medicineId === med.id && b.quantity > 0);

      // Stock valuation (purchase value & retail value)
      let purchaseVal = 0;
      let retailVal = 0;
      for (const b of medBatches) {
        purchaseVal += b.quantity * (b.purchasePrice || 0);
        retailVal += b.quantity * (b.sellingPrice || b.purchasePrice || 0);
      }

      let stockState: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (inv.availableUnits === 0) {
        stockState = 'OUT_OF_STOCK';
      } else if (inv.availableUnits < med.minStockLevel) {
        stockState = 'LOW_STOCK';
      }

      return {
        medicine: med,
        inventory: inv,
        purchaseVal,
        retailVal,
        stockState,
        batchesCount: medBatches.length,
      };
    });
  }, [medicines, batches]);

  // Totals
  const totals = useMemo(() => {
    let totalUnits = 0;
    let totalPurchaseVal = 0;
    let totalRetailVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of inventoryList) {
      totalUnits += item.inventory.availableUnits;
      totalPurchaseVal += item.purchaseVal;
      totalRetailVal += item.retailVal;
      if (item.stockState === 'LOW_STOCK') lowStockCount++;
      if (item.stockState === 'OUT_OF_STOCK') outOfStockCount++;
    }

    return {
      totalUnits,
      totalPurchaseVal,
      totalRetailVal,
      lowStockCount,
      outOfStockCount,
    };
  }, [inventoryList]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => m.category && set.add(m.category));
    return Array.from(set);
  }, [medicines]);

  // Filtered list
  const filteredList = useMemo(() => {
    return inventoryList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.medicine.name.toLowerCase().includes(q) ||
        (item.medicine.genericName || '').toLowerCase().includes(q) ||
        item.medicine.category.toLowerCase().includes(q);

      const matchCategory = categoryFilter === 'ALL' || item.medicine.category === categoryFilter;
      const matchStatus = stockStatusFilter === 'ALL' || item.stockState === stockStatusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [inventoryList, searchQuery, categoryFilter, stockStatusFilter]);

  const handleExportCSV = () => {
    if (inventoryList.length === 0) return;
    const headers = [
      'Medicine Name',
      'Generic Name',
      'Category',
      'Dosage Form',
      'Available Units',
      'Expired Units',
      'Min Stock Level',
      'Stock Status',
      'Cost Valuation',
      'Retail Valuation',
    ];

    const rows = inventoryList.map((i) => [
      `"${i.medicine.name}"`,
      `"${i.medicine.genericName || ''}"`,
      `"${i.medicine.category}"`,
      `"${i.medicine.dosageForm}"`,
      i.inventory.availableUnits,
      i.inventory.expiredUnits,
      i.medicine.minStockLevel,
      i.stockState,
      i.purchaseVal.toFixed(2),
      i.retailVal.toFixed(2),
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmavault_inventory_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Boxes className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Inventory & Stock Valuation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live stock counts calculated from valid batches, reorder thresholds, and inventory asset valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Inventory
          </button>
          <button
            onClick={onOpenAddMedicine}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Available Stock
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totals.totalUnits.toLocaleString()} units
          </div>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Non-expired active stock</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Inventory Cost Valuation
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {currencySymbol}{totals.totalPurchaseVal.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Acquisition cost of stock</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Retail Asset Value
          </span>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
            {currencySymbol}{totals.totalRetailVal.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Projected retail value</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Stock Health Alerts
          </span>
          <div className="text-2xl font-bold mt-1 flex items-center gap-2">
            <span className="text-amber-500">{totals.lowStockCount} Low</span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-rose-500">{totals.outOfStockCount} Out</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Threshold deficit warnings</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by medicine, generic, category..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock (Healthy)</option>
            <option value="LOW_STOCK">Low Stock (Deficit)</option>
            <option value="OUT_OF_STOCK">Out of Stock (Zero)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Boxes className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Inventory Matches
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {medicines.length === 0
              ? 'No medicines added yet. Start by adding your first medicine.'
              : 'Try clearing your filters or search keyword.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Medicine & Form</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Units</th>
                  <th className="py-3 px-4 text-right">Min Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Asset Valuation</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredList.map((item) => (
                  <tr key={item.medicine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.medicine.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.medicine.dosageForm} {item.medicine.strength ? `• ${item.medicine.strength}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.medicine.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {item.inventory.availableUnits}
                      {item.inventory.expiredUnits > 0 && (
                        <span className="block text-[10px] text-rose-500 font-normal">
                          +{item.inventory.expiredUnits} expired
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {item.medicine.minStockLevel}
                    </td>
                    <td className="py-3 px-4">
                      {item.stockState === 'IN_STOCK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> In Stock
                        </span>
                      ) : item.stockState === 'LOW_STOCK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          <AlertTriangle className="w-3 h-3" /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {currencySymbol}{item.retailVal.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cost: {currencySymbol}{item.purchaseVal.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewMedicine(item.medicine)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenAddBatch(item.medicine.id)}
                          className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 dark:text-teal-300 font-semibold text-[11px] transition-colors"
                          title="Add Batch"
                        >
                          + Batch
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
