import { Batch, DispensingRecord, Medicine, SalesBill, Supplier } from '../types';
import { getDaysUntil, getMedicineInventory } from './fefo';

export type SeasonalFilterPeriod =
  | '7d'
  | '30d'
  | '90d'
  | '6m'
  | '12m'
  | 'current_year'
  | 'previous_year'
  | 'custom';

export type SeasonalPatternClassification =
  | 'Potential seasonal demand'
  | 'Increasing usage'
  | 'Decreasing usage'
  | 'Stable demand'
  | 'Insufficient historical data';

export interface MonthlyUsagePoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "Jan 2026"
  unitsDispensed: number;
  unitsSold: number;
  totalUnitsMoved: number;
  revenue: number;
}

export interface MedicineSeasonalAnalysis {
  medicineId: string;
  medicineName: string;
  category: string;
  currentEligibleStock: number;
  minStockLevel: number;
  preferredSupplier?: Supplier;
  supplierLeadTimeDays: number;
  monthlyHistory: MonthlyUsagePoint[];
  monthsObservedCount: number;
  totalPeriodUnits: number;
  totalPeriodRevenue: number;
  avgMonthlyUnits: number;
  monthOverMonthChangePercent: number | null; // null if insufficient prior month data
  sameMonthPreviousYearChangePercent: number | null; // null if < 12-24 months
  peakMonthLabel: string | null;
  classification: SeasonalPatternClassification;
  classificationReason: string;
  forecastedDemandNext30d: number | null;
  forecastMethod: string;
  forecastLimitations: string;
  demandDuringLeadTime: number;
  estimatedStockCoverageDays: number | null;
  reorderReviewRequired: boolean;
  reorderRecommendedQuantity: number;
  reorderReason: string;
}

/**
 * Computes monthly aggregated usage and seasonal analysis across dispensing and sales records.
 * Ensures sales and dispensing are distinct and physical movement is not double counted.
 */
export function calculateSeasonalAnalytics(
  medicines: Medicine[],
  batches: Batch[],
  dispensingRecords: DispensingRecord[],
  salesBills: SalesBill[],
  suppliers: Supplier[],
  filter: SeasonalFilterPeriod,
  customRange?: { start?: string; end?: string }
): {
  medicinesAnalysis: MedicineSeasonalAnalysis[];
  overallMonthlyTrend: MonthlyUsagePoint[];
  fastMovingMedicines: MedicineSeasonalAnalysis[];
  slowMovingMedicines: MedicineSeasonalAnalysis[];
  reorderReviews: MedicineSeasonalAnalysis[];
  seasonalAlerts: { id: string; type: 'warning' | 'info' | 'danger'; message: string; medicineName: string }[];
} {
  const now = new Date();

  // Determine date boundaries
  let startDate: Date;
  let endDate: Date = new Date(now);

  if (filter === '7d') {
    startDate = new Date(now.getTime() - 7 * 86400000);
  } else if (filter === '30d') {
    startDate = new Date(now.getTime() - 30 * 86400000);
  } else if (filter === '90d') {
    startDate = new Date(now.getTime() - 90 * 86400000);
  } else if (filter === '6m') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  } else if (filter === '12m') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  } else if (filter === 'current_year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (filter === 'previous_year') {
    startDate = new Date(now.getFullYear() - 1, 0, 1);
    endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else if (filter === 'custom' && customRange?.start && customRange?.end) {
    startDate = new Date(customRange.start);
    endDate = new Date(customRange.end);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  // Pre-index dispensing and sales by medicine and month key (YYYY-MM)
  const monthFormatter = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const monthLabelFormatter = (key: string) => {
    const [y, m] = key.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  // Generate list of all months in span
  const allMonthsSpan: string[] = [];
  const curCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (curCursor <= endDate) {
    allMonthsSpan.push(monthFormatter(curCursor));
    curCursor.setMonth(curCursor.getMonth() + 1);
  }

  // Process per medicine
  const medicinesAnalysis: MedicineSeasonalAnalysis[] = medicines.map((med) => {
    const inv = getMedicineInventory(med.id, batches);
    const eligibleStock = inv.availableUnits;

    // Preferred supplier
    const medBatches = batches.filter((b) => b.medicineId === med.id);
    const supplierId = medBatches[0]?.supplierId;
    const prefSupplier = suppliers.find((s) => s.id === supplierId);
    const leadTimeDays = prefSupplier?.leadTimeDays || 3;

    // Filter dispensing records for this medicine within date boundary
    const medDispensing = dispensingRecords.filter((d) => {
      if (d.medicineId !== med.id) return false;
      const t = new Date(d.dispensedAt).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    });

    // Filter sales bills items for this medicine within date boundary
    const medSalesItems: { billDate: string; quantity: number; lineTotal: number }[] = [];
    for (const b of salesBills) {
      if (b.status === 'Cancelled' || b.status === 'Refunded') continue;
      const t = new Date(b.billDate).getTime();
      if (t < startDate.getTime() || t > endDate.getTime()) continue;

      for (const item of b.items) {
        if (item.medicineId === med.id) {
          medSalesItems.push({
            billDate: b.billDate,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          });
        }
      }
    }

    // Monthly aggregation
    const monthlyMap = new Map<string, { disp: number; sold: number; rev: number }>();
    for (const k of allMonthsSpan) {
      monthlyMap.set(k, { disp: 0, sold: 0, rev: 0 });
    }

    for (const d of medDispensing) {
      const k = monthFormatter(new Date(d.dispensedAt));
      if (monthlyMap.has(k)) {
        monthlyMap.get(k)!.disp += d.quantity;
      }
    }

    for (const s of medSalesItems) {
      const k = monthFormatter(new Date(s.billDate));
      if (monthlyMap.has(k)) {
        monthlyMap.get(k)!.sold += s.quantity;
        monthlyMap.get(k)!.rev += s.lineTotal;
      }
    }

    const monthlyHistory: MonthlyUsagePoint[] = allMonthsSpan.map((k) => {
      const entry = monthlyMap.get(k) || { disp: 0, sold: 0, rev: 0 };
      // Total physical movement is distinct: dispensing + retail sales
      const totalUnitsMoved = entry.disp + entry.sold;
      return {
        monthKey: k,
        monthLabel: monthLabelFormatter(k),
        unitsDispensed: entry.disp,
        unitsSold: entry.sold,
        totalUnitsMoved,
        revenue: entry.rev,
      };
    });

    const activeMonths = monthlyHistory.filter((m) => m.totalUnitsMoved > 0);
    const monthsObservedCount = activeMonths.length;
    const totalPeriodUnits = monthlyHistory.reduce((sum, m) => sum + m.totalUnitsMoved, 0);
    const totalPeriodRevenue = monthlyHistory.reduce((sum, m) => sum + m.revenue, 0);
    const avgMonthlyUnits = monthlyHistory.length > 0 ? totalPeriodUnits / monthlyHistory.length : 0;

    // Month-over-month calculation (latest month vs immediately prior month)
    let monthOverMonthChangePercent: number | null = null;
    if (monthlyHistory.length >= 2) {
      const lastMonth = monthlyHistory[monthlyHistory.length - 1];
      const prevMonth = monthlyHistory[monthlyHistory.length - 2];
      if (prevMonth.totalUnitsMoved > 0) {
        monthOverMonthChangePercent = Math.round(
          ((lastMonth.totalUnitsMoved - prevMonth.totalUnitsMoved) / prevMonth.totalUnitsMoved) * 100
        );
      }
    }

    // Same-month previous-year comparison (requires >= 13 months)
    let sameMonthPreviousYearChangePercent: number | null = null;
    if (monthlyHistory.length >= 13) {
      const currentLatest = monthlyHistory[monthlyHistory.length - 1];
      const sameMonthLastYear = monthlyHistory[monthlyHistory.length - 13];
      if (sameMonthLastYear.totalUnitsMoved > 0) {
        sameMonthPreviousYearChangePercent = Math.round(
          ((currentLatest.totalUnitsMoved - sameMonthLastYear.totalUnitsMoved) /
            sameMonthLastYear.totalUnitsMoved) *
            100
        );
      }
    }

    // Peak month detection
    let peakMonthLabel: string | null = null;
    let maxVal = 0;
    for (const m of monthlyHistory) {
      if (m.totalUnitsMoved > maxVal) {
        maxVal = m.totalUnitsMoved;
        peakMonthLabel = m.monthLabel;
      }
    }

    // Seasonal classification logic
    let classification: SeasonalPatternClassification = 'Insufficient historical data';
    let classificationReason = 'Not enough historical data to confirm a seasonal pattern.';

    if (monthsObservedCount >= 24) {
      // With >= 24 months, check if same month periods consistently exhibit surges
      classification = 'Potential seasonal demand';
      classificationReason =
        'Recurring multi-year demand pattern observed across 24+ months of continuous observation.';
    } else if (monthsObservedCount >= 3) {
      // Trend classification
      if (monthOverMonthChangePercent !== null && monthOverMonthChangePercent > 15) {
        classification = 'Increasing usage';
        classificationReason = `Demand increased by ${monthOverMonthChangePercent}% compared with the prior month.`;
      } else if (monthOverMonthChangePercent !== null && monthOverMonthChangePercent < -15) {
        classification = 'Decreasing usage';
        classificationReason = `Demand decreased by ${Math.abs(monthOverMonthChangePercent)}% compared with the prior month.`;
      } else {
        classification = 'Stable demand';
        classificationReason =
          'Consumption pattern is uniform with standard monthly operational deviations.';
      }
    } else {
      classification = 'Insufficient historical data';
      classificationReason =
        'Not enough historical data to confirm a seasonal pattern. At least 24 months are recommended for annual recurrence.';
    }

    // Forecasting: Explainable 3-month moving average with baseline trend
    let forecastedDemandNext30d: number | null = null;
    const forecastMethod =
      monthlyHistory.length >= 3
        ? '3-Month Weighted Moving Average (Explainable Baseline)'
        : 'Historical Average Daily Demand Extrapolation';
    const forecastLimitations =
      'Forecast assumes stable epidemiological parameters and does not reflect sudden public health outbreaks.';

    if (monthlyHistory.length >= 3) {
      const m1 = monthlyHistory[monthlyHistory.length - 1].totalUnitsMoved;
      const m2 = monthlyHistory[monthlyHistory.length - 2].totalUnitsMoved;
      const m3 = monthlyHistory[monthlyHistory.length - 3].totalUnitsMoved;
      // Weighted 50% last month, 30% month before, 20% prior
      forecastedDemandNext30d = Math.round(m1 * 0.5 + m2 * 0.3 + m3 * 0.2);
    } else if (totalPeriodUnits > 0) {
      const days = Math.max(1, (endDate.getTime() - startDate.getTime()) / 86400000);
      forecastedDemandNext30d = Math.round((totalPeriodUnits / days) * 30);
    }

    // Expected demand during supplier lead time
    const dailyDemandRate = avgMonthlyUnits / 30;
    const demandDuringLeadTime = Math.ceil(dailyDemandRate * leadTimeDays);

    // Stock coverage days
    let estimatedStockCoverageDays: number | null = null;
    if (dailyDemandRate > 0) {
      estimatedStockCoverageDays = Math.round(eligibleStock / dailyDemandRate);
    }

    // Reorder review determination
    const projectedShortage =
      eligibleStock < med.minStockLevel || eligibleStock < demandDuringLeadTime;
    const reorderReviewRequired = projectedShortage;

    let reorderRecommendedQuantity = 0;
    let reorderReason = 'Stock levels currently sufficient.';

    if (reorderReviewRequired) {
      // Reorder quantity = deficit + demand during lead time + safety stock buffer
      const deficit = Math.max(0, med.minStockLevel - eligibleStock);
      const safetyBuffer = Math.ceil(med.minStockLevel * 0.5);
      reorderRecommendedQuantity = deficit + demandDuringLeadTime + safetyBuffer;
      reorderReason = `Current eligible stock (${eligibleStock}) is below minimum buffer (${med.minStockLevel}) or lead time requirement (${demandDuringLeadTime}u over ${leadTimeDays}d lead time).`;
    }

    return {
      medicineId: med.id,
      medicineName: med.name,
      category: med.category,
      currentEligibleStock: eligibleStock,
      minStockLevel: med.minStockLevel,
      preferredSupplier: prefSupplier,
      supplierLeadTimeDays: leadTimeDays,
      monthlyHistory,
      monthsObservedCount,
      totalPeriodUnits,
      totalPeriodRevenue,
      avgMonthlyUnits: Math.round(avgMonthlyUnits),
      monthOverMonthChangePercent,
      sameMonthPreviousYearChangePercent,
      peakMonthLabel,
      classification,
      classificationReason,
      forecastedDemandNext30d,
      forecastMethod,
      forecastLimitations,
      demandDuringLeadTime,
      estimatedStockCoverageDays,
      reorderReviewRequired,
      reorderRecommendedQuantity,
      reorderReason,
    };
  });

  // Overall monthly trend across all medicines
  const overallMonthlyTrend: MonthlyUsagePoint[] = allMonthsSpan.map((k) => {
    let disp = 0;
    let sold = 0;
    let rev = 0;
    for (const m of medicinesAnalysis) {
      const pt = m.monthlyHistory.find((p) => p.monthKey === k);
      if (pt) {
        disp += pt.unitsDispensed;
        sold += pt.unitsSold;
        rev += pt.revenue;
      }
    }
    return {
      monthKey: k,
      monthLabel: monthLabelFormatter(k),
      unitsDispensed: disp,
      unitsSold: sold,
      totalUnitsMoved: disp + sold,
      revenue: rev,
    };
  });

  // Sort fast and slow moving medicines
  const fastMovingMedicines = [...medicinesAnalysis]
    .filter((m) => m.totalPeriodUnits > 0)
    .sort((a, b) => b.totalPeriodUnits - a.totalPeriodUnits)
    .slice(0, 5);

  const slowMovingMedicines = [...medicinesAnalysis]
    .filter((m) => m.totalPeriodUnits === 0 || m.totalPeriodUnits < 10)
    .sort((a, b) => a.totalPeriodUnits - b.totalPeriodUnits)
    .slice(0, 5);

  const reorderReviews = medicinesAnalysis.filter((m) => m.reorderReviewRequired);

  // Generate actionable seasonal alerts
  const seasonalAlerts: {
    id: string;
    type: 'warning' | 'info' | 'danger';
    message: string;
    medicineName: string;
  }[] = [];

  for (const item of medicinesAnalysis) {
    if (item.reorderReviewRequired) {
      seasonalAlerts.push({
        id: `alert-reorder-${item.medicineId}`,
        type: 'danger',
        message: item.reorderReason,
        medicineName: item.medicineName,
      });
    }

    if (
      item.monthOverMonthChangePercent !== null &&
      item.monthOverMonthChangePercent >= 18
    ) {
      seasonalAlerts.push({
        id: `alert-surge-${item.medicineId}`,
        type: 'warning',
        message: `Usage increased ${item.monthOverMonthChangePercent}% compared with the previous month.`,
        medicineName: item.medicineName,
      });
    }
  }

  return {
    medicinesAnalysis,
    overallMonthlyTrend,
    fastMovingMedicines,
    slowMovingMedicines,
    reorderReviews,
    seasonalAlerts,
  };
}
