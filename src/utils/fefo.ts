import { Batch, BatchAllocation, DispensingRecord, ExpiryAnalysis, ExpiryStatusType, Medicine, ReorderRecommendation, Supplier } from '../types';

export function getDaysUntil(dateString?: string | null): number {
  if (!dateString) return -999999;
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return -999999;
  const now = new Date();
  // Strip time for accurate day calculation
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil((targetMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiryDate?: string | null): ExpiryAnalysis {
  if (!expiryDate) {
    return {
      status: 'EXPIRED',
      daysRemaining: -999999,
      label: 'No Expiry Date',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    };
  }
  const days = getDaysUntil(expiryDate);
  if (days < 0) {
    return {
      status: 'EXPIRED',
      daysRemaining: days,
      label: days < -10000 ? 'Expired' : `Expired ${Math.abs(days)}d ago`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    };
  }
  if (days === 0) {
    return {
      status: 'EXPIRED',
      daysRemaining: 0,
      label: 'Expires Today',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    };
  }
  if (days <= 30) {
    return {
      status: 'CRITICAL',
      daysRemaining: days,
      label: `${days}d left (Critical)`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    };
  }
  if (days <= 90) {
    return {
      status: 'NEAR_EXPIRY',
      daysRemaining: days,
      label: `${days}d left (Near)`,
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900',
    };
  }
  return {
    status: 'GOOD',
    daysRemaining: days,
    label: `${days}d left (Valid)`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  };
}

/**
 * Calculates First-Expired, First-Out (FEFO) sorted batches.
 * Earliest expiry date comes first.
 */
export function sortBatchesFEFO(batches: Batch[]): Batch[] {
  if (!Array.isArray(batches)) return [];
  return [...batches].sort((a, b) => {
    const timeA = a?.expiryDate ? new Date(a.expiryDate).getTime() : 0;
    const timeB = b?.expiryDate ? new Date(b.expiryDate).getTime() : 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    if (timeA !== timeB) return timeA - timeB;
    // Tie-breaker: creation time or batch number
    return (a?.batchNumber || '').localeCompare(b?.batchNumber || '');
  });
}

/**
 * Calculates current available stock for a medicine from non-expired batches.
 */
export function getMedicineInventory(medicineId: string, batches: Batch[]): {
  totalUnits: number;
  availableUnits: number;
  expiredUnits: number;
  activeBatchesCount: number;
  expiredBatchesCount: number;
  nearExpiryBatchesCount: number;
  earliestExpiryDate?: string;
} {
  if (!medicineId || !Array.isArray(batches)) {
    return {
      totalUnits: 0,
      availableUnits: 0,
      expiredUnits: 0,
      activeBatchesCount: 0,
      expiredBatchesCount: 0,
      nearExpiryBatchesCount: 0,
    };
  }
  const medBatches = batches.filter((b) => b && b.medicineId === medicineId);
  let totalUnits = 0;
  let availableUnits = 0;
  let expiredUnits = 0;
  let activeBatchesCount = 0;
  let expiredBatchesCount = 0;
  let nearExpiryBatchesCount = 0;

  const validBatches: Batch[] = [];

  for (const b of medBatches) {
    const qty = Number(b.quantity) || 0;
    totalUnits += qty;
    const days = getDaysUntil(b.expiryDate);
    if (days < 0) {
      expiredUnits += qty;
      if (qty > 0) expiredBatchesCount++;
    } else {
      availableUnits += qty;
      if (qty > 0) {
        activeBatchesCount++;
        validBatches.push(b);
        if (days <= 60) {
          nearExpiryBatchesCount++;
        }
      }
    }
  }

  const sortedValid = sortBatchesFEFO(validBatches);
  const earliestExpiryDate = sortedValid.length > 0 ? sortedValid[0].expiryDate : undefined;

  return {
    totalUnits,
    availableUnits,
    expiredUnits,
    activeBatchesCount,
    expiredBatchesCount,
    nearExpiryBatchesCount,
    earliestExpiryDate,
  };
}

export interface FEFOAllocationResult {
  allocations: BatchAllocation[];
  totalAllocated: number;
  totalAvailable: number;
  isSufficient: boolean;
  shortfall: number;
}

/**
 * Automatically allocates dispensing using First-Expired, First-Out rule.
 */
export function calculateFEFOAllocation(
  requestedQuantity: number,
  medicineId: string,
  batches: Batch[],
  allowExpired = false
): FEFOAllocationResult {
  if (!medicineId || requestedQuantity <= 0 || !Array.isArray(batches)) {
    return {
      allocations: [],
      totalAllocated: 0,
      totalAvailable: 0,
      isSufficient: false,
      shortfall: Math.max(0, requestedQuantity),
    };
  }

  // Filter eligible batches
  const eligible = batches.filter((b) => {
    if (!b || b.medicineId !== medicineId) return false;
    const qty = Number(b.quantity) || 0;
    if (qty <= 0) return false;
    if (!allowExpired && getDaysUntil(b.expiryDate) < 0) return false;
    return true;
  });

  // Sort by FEFO (earliest expiry first)
  const sorted = sortBatchesFEFO(eligible);

  const allocations: BatchAllocation[] = [];
  let remainingNeeded = requestedQuantity;
  let totalAvailable = 0;

  for (const b of sorted) {
    totalAvailable += Number(b.quantity) || 0;
  }

  for (const b of sorted) {
    if (remainingNeeded <= 0) break;
    const qty = Number(b.quantity) || 0;
    const take = Math.min(qty, remainingNeeded);
    if (take > 0) {
      allocations.push({
        batchId: b.id,
        batchNumber: b.batchNumber || 'Unknown',
        expiryDate: b.expiryDate,
        quantity: take,
      });
      remainingNeeded -= take;
    }
  }

  const totalAllocated = requestedQuantity - remainingNeeded;

  return {
    allocations,
    totalAllocated,
    totalAvailable,
    isSufficient: remainingNeeded === 0,
    shortfall: Math.max(0, remainingNeeded),
  };
}

/**
 * Computes reorder recommendations based on available stock, minimum stock level,
 * and actual usage intelligence (average daily usage × supplier lead time + safety stock).
 */
export function computeReorderRecommendations(
  medicines: Medicine[],
  batches: Batch[],
  suppliers: Supplier[],
  dispensingRecords?: DispensingRecord[]
): ReorderRecommendation[] {
  if (!Array.isArray(medicines) || !Array.isArray(batches)) return [];
  const validSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const validRecords = Array.isArray(dispensingRecords) ? dispensingRecords : [];
  const recommendations: ReorderRecommendation[] = [];

  // Calculate 30-day usage per medicine for lead time demand estimation
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const recentRecords = validRecords.filter((r) => {
    if (!r || !r.dispensedAt) return false;
    return new Date(r.dispensedAt).getTime() >= thirtyDaysAgo;
  });

  const usageByMed = new Map<string, number>();
  for (const r of recentRecords) {
    const qty = Number(r.quantity) || 0;
    usageByMed.set(r.medicineId, (usageByMed.get(r.medicineId) || 0) + qty);
  }

  for (const med of medicines) {
    if (!med || med.status !== 'Active') continue;
    const { availableUnits } = getMedicineInventory(med.id, batches);
    const minStock = Number(med.minStockLevel) || 0;

    // Find preferred supplier from batches or first supplier
    const medBatches = batches.filter((b) => b && b.medicineId === med.id);
    let preferredSupplier: Supplier | undefined;
    if (medBatches.length > 0) {
      const lastBatch = medBatches[medBatches.length - 1];
      if (lastBatch) {
        preferredSupplier = validSuppliers.find((s) => s && s.id === lastBatch.supplierId);
      }
    }
    if (!preferredSupplier && validSuppliers.length > 0) {
      preferredSupplier = validSuppliers[0];
    }

    const leadTime = preferredSupplier?.leadTimeDays || 3;
    const past30Units = usageByMed.get(med.id) || 0;
    const avgDailyUsage = past30Units > 0 ? past30Units / 30 : 0;
    const estimatedDemandDuringLeadTime = Math.ceil(avgDailyUsage * leadTime);
    const safetyStockBuffer = Math.ceil(avgDailyUsage * Math.max(2, Math.round(leadTime * 0.5)));

    // Trigger reorder if available units <= minStock, or stock cannot cover lead time demand
    const isBelowMin = availableUnits <= minStock;
    const isDepletedByLeadTime = avgDailyUsage > 0 && availableUnits <= (estimatedDemandDuringLeadTime + minStock * 0.5);

    if (isBelowMin || isDepletedByLeadTime) {
      const deficit = Math.max(0, minStock - availableUnits);

      let suggestedReorderQuantity = 0;
      if (avgDailyUsage > 0) {
        // Usage-informed recommendation: replenish to cover lead time demand + safety stock + target min stock buffer
        const targetStock = minStock + estimatedDemandDuringLeadTime + safetyStockBuffer;
        suggestedReorderQuantity = Math.max(
          deficit + minStock,
          targetStock - availableUnits,
          Math.ceil(avgDailyUsage * 14), // at least 2 weeks of supply
          20
        );
      } else {
        // Standard reorder quantity when no usage history exists
        suggestedReorderQuantity = Math.max(deficit + minStock, minStock * 2 - availableUnits, 20);
      }

      recommendations.push({
        medicine: med,
        currentStock: availableUnits,
        minStockLevel: minStock,
        deficit,
        suggestedReorderQuantity,
        preferredSupplier,
        estimatedDemandDuringLeadTime: estimatedDemandDuringLeadTime > 0 ? estimatedDemandDuringLeadTime : undefined,
        safetyStockBuffer: safetyStockBuffer > 0 ? safetyStockBuffer : undefined,
        isUsageInformed: avgDailyUsage > 0,
      });
    }
  }

  return recommendations;
}
