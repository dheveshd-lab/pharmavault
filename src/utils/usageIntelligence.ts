import { Batch, DispensingRecord, Medicine, MedicineUsageMetrics, Supplier, UsageClassification, UsagePeriodConfig, UsagePeriodFilter, UsageTrendDirection } from '../types';
import { getMedicineInventory } from './fefo';

/**
 * Calculates start, end, and previous period dates based on the selected filter.
 */
export function getPeriodDateBoundaries(
  filter: UsagePeriodFilter,
  customRange?: { start?: string; end?: string }
): UsagePeriodConfig {
  const now = new Date();
  let daysCount = 30;
  let startDate: Date;
  let endDate: Date = new Date(now);

  if (filter === '7d') {
    daysCount = 7;
    startDate = new Date(now.getTime() - 7 * 86400000);
  } else if (filter === '30d') {
    daysCount = 30;
    startDate = new Date(now.getTime() - 30 * 86400000);
  } else if (filter === '60d') {
    daysCount = 60;
    startDate = new Date(now.getTime() - 60 * 86400000);
  } else if (filter === '90d') {
    daysCount = 90;
    startDate = new Date(now.getTime() - 90 * 86400000);
  } else if (filter === 'custom' && customRange?.start && customRange?.end) {
    const s = new Date(customRange.start);
    const e = new Date(customRange.end);
    // Set e to end of day
    e.setHours(23, 59, 59, 999);
    startDate = isNaN(s.getTime()) ? new Date(now.getTime() - 30 * 86400000) : s;
    endDate = isNaN(e.getTime()) ? new Date(now) : e;
    const diffTime = Math.max(86400000, endDate.getTime() - startDate.getTime());
    daysCount = Math.max(1, Math.round(diffTime / 86400000));
  } else {
    daysCount = 30;
    startDate = new Date(now.getTime() - 30 * 86400000);
  }

  // Calculate previous equivalent period
  const prevDurationMs = daysCount * 86400000;
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(startDate.getTime() - prevDurationMs);

  return {
    filter,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    daysCount,
    previousStartDate: previousStartDate.toISOString(),
    previousEndDate: previousEndDate.toISOString(),
  };
}

/**
 * Standard Ordinary Least Squares (OLS) Linear Regression: y = mx + b
 * x: time index (day offset), y: daily dispensed quantity
 */
export function computeLinearRegression(
  dataPoints: { x: number; y: number }[]
): { slope: number; intercept: number; r2: number } | null {
  if (!dataPoints || dataPoints.length < 3) return null;

  const n = dataPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const pt of dataPoints) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumXX += pt.x * pt.x;
    sumYY += pt.y * pt.y;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Coefficient of determination (R^2)
  const ssTotal = sumYY - (sumY * sumY) / n;
  const ssRes = sumYY - intercept * sumY - slope * sumXY;
  const r2 = ssTotal !== 0 ? Math.max(0, 1 - ssRes / ssTotal) : 0;

  return { slope, intercept, r2 };
}

/**
 * Dynamically classifies medicines by actual relative usage.
 * Strictly driven by actual database dispensing records without hardcoded values.
 */
export function classifyUsageVolumes(
  usageByMedicine: Map<string, number>
): Map<string, UsageClassification> {
  const result = new Map<string, UsageClassification>();
  const activeEntries: { id: string; units: number }[] = [];

  usageByMedicine.forEach((units, id) => {
    if (units > 0) {
      activeEntries.push({ id, units });
    } else {
      result.set(id, 'NO RECENT USAGE');
    }
  });

  if (activeEntries.length === 0) {
    return result;
  }

  // Sort descending by usage
  activeEntries.sort((a, b) => b.units - a.units);

  if (activeEntries.length === 1) {
    result.set(activeEntries[0].id, 'HIGH USAGE');
    return result;
  }

  if (activeEntries.length === 2) {
    result.set(activeEntries[0].id, 'HIGH USAGE');
    result.set(activeEntries[1].id, 'MODERATE');
    return result;
  }

  // For 3 or more medicines, divide into dynamic quantiles
  const maxUnits = activeEntries[0].units;
  const totalCount = activeEntries.length;

  activeEntries.forEach((entry, index) => {
    const rankPercentile = (totalCount - index) / totalCount;
    // Top 30% of dispensed medicines OR at least 65% of the highest volume medicine
    if (rankPercentile >= 0.7 || (maxUnits > 0 && entry.units >= maxUnits * 0.65)) {
      result.set(entry.id, 'HIGH USAGE');
    } else if (rankPercentile >= 0.35 || (maxUnits > 0 && entry.units >= maxUnits * 0.25)) {
      result.set(entry.id, 'MODERATE');
    } else {
      result.set(entry.id, 'LOW USAGE');
    }
  });

  return result;
}

/**
 * Calculates comprehensive Usage Intelligence for all medicines based on actual dispensing history.
 */
export function calculateUsageIntelligence(
  medicines: Medicine[],
  batches: Batch[],
  dispensingRecords: DispensingRecord[],
  suppliers: Supplier[],
  periodConfig: UsagePeriodConfig = getPeriodDateBoundaries('30d')
): {
  metrics: MedicineUsageMetrics[];
  totalDispensedInPeriod: number;
  totalTransactionsInPeriod: number;
  highUsageCount: number;
  urgentReorderCount: number;
  fastMovingMedicines: MedicineUsageMetrics[];
  usageAlerts: {
    type: 'high_usage' | 'increasing_demand' | 'urgent_reorder';
    medicine: MedicineUsageMetrics;
    title: string;
    message: string;
    recommendation: string;
  }[];
} {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeBatches = Array.isArray(batches) ? batches : [];
  const safeRecords = Array.isArray(dispensingRecords) ? dispensingRecords : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const currentStartMs = new Date(periodConfig.startDate).getTime();
  const currentEndMs = new Date(periodConfig.endDate).getTime();
  const prevStartMs = new Date(periodConfig.previousStartDate).getTime();
  const prevEndMs = new Date(periodConfig.previousEndDate).getTime();

  // Filter dispensing records for current and previous period
  const currentRecords = safeRecords.filter((r) => {
    if (!r || !r.dispensedAt) return false;
    const time = new Date(r.dispensedAt).getTime();
    return time >= currentStartMs && time <= currentEndMs;
  });

  const previousRecords = safeRecords.filter((r) => {
    if (!r || !r.dispensedAt) return false;
    const time = new Date(r.dispensedAt).getTime();
    return time >= prevStartMs && time <= prevEndMs;
  });

  // Aggregate current period usage by medicine
  const currentUsageMap = new Map<string, number>();
  const currentTxCountMap = new Map<string, number>();
  const currentDailyBreakdownMap = new Map<string, Map<string, number>>();

  for (const r of currentRecords) {
    const medId = r.medicineId;
    const qty = Number(r.quantity) || 0;
    currentUsageMap.set(medId, (currentUsageMap.get(medId) || 0) + qty);
    currentTxCountMap.set(medId, (currentTxCountMap.get(medId) || 0) + 1);

    // Daily breakdown for charts and regression
    const dayKey = r.dispensedAt.split('T')[0];
    if (!currentDailyBreakdownMap.has(medId)) {
      currentDailyBreakdownMap.set(medId, new Map());
    }
    const medDayMap = currentDailyBreakdownMap.get(medId)!;
    medDayMap.set(dayKey, (medDayMap.get(dayKey) || 0) + qty);
  }

  // Aggregate previous period usage by medicine
  const prevUsageMap = new Map<string, number>();
  for (const r of previousRecords) {
    const medId = r.medicineId;
    const qty = Number(r.quantity) || 0;
    prevUsageMap.set(medId, (prevUsageMap.get(medId) || 0) + qty);
  }

  // Classify dynamically based on actual usage
  const classifications = classifyUsageVolumes(currentUsageMap);

  const metrics: MedicineUsageMetrics[] = [];
  let totalDispensedInPeriod = 0;
  let totalTransactionsInPeriod = currentRecords.length;

  for (const med of safeMedicines) {
    if (!med) continue;

    const totalUsed = currentUsageMap.get(med.id) || 0;
    totalDispensedInPeriod += totalUsed;

    const txCount = currentTxCountMap.get(med.id) || 0;
    const prevUsed = prevUsageMap.get(med.id) || 0;
    const avgDaily = Number((totalUsed / periodConfig.daysCount).toFixed(2));

    const inv = getMedicineInventory(med.id, safeBatches);
    const currentStock = inv.availableUnits;
    const minStock = Number(med.minStockLevel) || 0;

    // Estimated Days of Stock Remaining
    const daysRemaining = avgDaily > 0 ? Number((currentStock / avgDaily).toFixed(1)) : null;

    // Trend calculation comparing with previous equivalent period
    let usageChangePercent: number | null = null;
    let trendDirection: UsageTrendDirection = 'insufficient_data';
    let trendMessage: string | undefined;

    if (prevUsed > 0) {
      const pct = Math.round(((totalUsed - prevUsed) / prevUsed) * 100);
      usageChangePercent = pct;
      if (pct > 0) {
        trendDirection = 'increasing';
        trendMessage = `Demand increasing: usage is ${pct}% higher than the previous period.`;
      } else if (pct < 0) {
        trendDirection = 'decreasing';
        trendMessage = `Demand decreasing: usage is ${Math.abs(pct)}% lower than the previous period.`;
      } else {
        trendDirection = 'stable';
        trendMessage = 'Demand stable: usage is unchanged compared to previous period.';
      }
    } else if (prevUsed === 0 && totalUsed > 0) {
      // User requested: "Do not display a trend percentage when there is insufficient historical data."
      trendDirection = 'increasing';
      usageChangePercent = null;
      trendMessage = `Demand increasing: new usage detected in current period (+${totalUsed} units).`;
    } else {
      trendDirection = 'insufficient_data';
      usageChangePercent = null;
    }

    const classification = classifications.get(med.id) || 'NO RECENT USAGE';
    const isHighUsage = classification === 'HIGH USAGE';

    // Preferred supplier and lead time
    const medBatches = safeBatches.filter((b) => b && b.medicineId === med.id);
    let preferredSupplier: Supplier | undefined;
    if (medBatches.length > 0) {
      const lastBatch = medBatches[medBatches.length - 1];
      if (lastBatch) {
        preferredSupplier = safeSuppliers.find((s) => s && s.id === lastBatch.supplierId);
      }
    }
    if (!preferredSupplier && safeSuppliers.length > 0) {
      preferredSupplier = safeSuppliers[0];
    }
    const supplierLeadTimeDays = preferredSupplier?.leadTimeDays || 3;

    // Prepare daily breakdown array for time-series charts and regression
    const medDayMap = currentDailyBreakdownMap.get(med.id);
    const dailyBreakdown: { date: string; quantity: number }[] = [];
    if (medDayMap) {
      const sortedDates = Array.from(medDayMap.keys()).sort();
      for (const d of sortedDates) {
        dailyBreakdown.push({ date: d, quantity: medDayMap.get(d) || 0 });
      }
    }

    // Linear Regression model for demand forecasting if sufficient data points exist
    let regressionSlope: number | null = null;
    let projectedDailyDemand: number | null = null;

    if (dailyBreakdown.length >= 3) {
      const firstTime = new Date(dailyBreakdown[0].date).getTime();
      const regressionPoints = dailyBreakdown.map((pt) => ({
        x: Math.round((new Date(pt.date).getTime() - firstTime) / 86400000),
        y: pt.quantity,
      }));

      const regResult = computeLinearRegression(regressionPoints);
      if (regResult) {
        regressionSlope = Number(regResult.slope.toFixed(3));
        const lastX = regressionPoints[regressionPoints.length - 1].x;
        const nextDayProjection = regResult.slope * (lastX + 1) + regResult.intercept;
        projectedDailyDemand = Math.max(0, Number(nextDayProjection.toFixed(2)));
      }
    }

    // Demand during supplier delivery
    const demandDuringLeadTime = Math.ceil(avgDaily * supplierLeadTimeDays);

    // Safety Stock Buffer: covers lead time variance + high usage buffer
    const safetyStockBuffer = Math.ceil(
      avgDaily * Math.max(2, Math.round(supplierLeadTimeDays * 0.5)) +
        (isHighUsage ? Math.ceil(minStock * 0.25) : 0)
    );

    // Suggested Reorder Quantity Recommendation
    // Replenishes to cover: lead time demand + safety stock + minimum stock deficit
    const targetBufferStock = Math.max(minStock * 2, minStock + demandDuringLeadTime + safetyStockBuffer);
    let rawSuggested = Math.max(0, targetBufferStock - currentStock);

    // Incorporate positive Linear Regression trend if demand is accelerating
    if (regressionSlope && regressionSlope > 0 && projectedDailyDemand && projectedDailyDemand > avgDaily) {
      const trendBonus = Math.ceil((projectedDailyDemand - avgDaily) * supplierLeadTimeDays);
      rawSuggested += trendBonus;
    }

    // If medicine is high usage and days remaining are low, ensure recommendation is at least 14 days of supply
    if (isHighUsage && avgDaily > 0) {
      rawSuggested = Math.max(rawSuggested, Math.ceil(avgDaily * 14));
    }

    const suggestedReorderQuantity = Math.max(0, Math.ceil(rawSuggested));

    // Urgent Reorder Condition (High Usage + Low Stock)
    const isLowStock = currentStock <= minStock;
    const isCriticallyFewDays = daysRemaining !== null && daysRemaining <= Math.max(7, supplierLeadTimeDays);
    const isUrgentReorder = isHighUsage && (isLowStock || isCriticallyFewDays);

    let urgentMessage: string | undefined;
    let suggestedAction: string | undefined;

    if (isUrgentReorder) {
      urgentMessage = `URGENT REORDER REVIEW: ${med.name} is being used at ${avgDaily} units/day and only ${
        daysRemaining !== null ? daysRemaining : 0
      } days of stock remain.`;
      suggestedAction = 'Review reorder quantity and supplier lead time.';
    } else if (isHighUsage) {
      suggestedAction = 'Consider maintaining a higher safety stock and reviewing the reorder quantity.';
    }

    metrics.push({
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.genericName,
      category: med.category,
      unit: med.unit || 'units',
      totalUnitsUsed: totalUsed,
      avgDailyUsage: avgDaily,
      transactionCount: txCount,
      currentStock,
      minStockLevel: minStock,
      estimatedDaysRemaining: daysRemaining,
      previousPeriodUnits: prevUsed,
      usageChangePercent,
      trendDirection,
      trendMessage,
      classification,
      isHighUsage,
      isUrgentReorder,
      urgentMessage,
      suggestedAction,
      suggestedReorderQuantity,
      preferredSupplier,
      supplierLeadTimeDays,
      demandDuringLeadTime,
      safetyStockBuffer,
      regressionSlope,
      projectedDailyDemand,
      dailyBreakdown,
    });
  }

  // Sort metrics: highest usage first
  metrics.sort((a, b) => b.totalUnitsUsed - a.totalUnitsUsed);

  const highUsageCount = metrics.filter((m) => m.isHighUsage).length;
  const urgentReorderCount = metrics.filter((m) => m.isUrgentReorder).length;
  const fastMovingMedicines = metrics.filter((m) => m.totalUnitsUsed > 0);

  // Generate alerts
  const usageAlerts: {
    type: 'high_usage' | 'increasing_demand' | 'urgent_reorder';
    medicine: MedicineUsageMetrics;
    title: string;
    message: string;
    recommendation: string;
  }[] = [];

  for (const m of metrics) {
    if (m.isUrgentReorder) {
      usageAlerts.push({
        type: 'urgent_reorder',
        medicine: m,
        title: 'URGENT REORDER REVIEW',
        message: `${m.medicineName} is being used at ${m.avgDailyUsage} units/day and only ${
          m.estimatedDaysRemaining !== null ? m.estimatedDaysRemaining : 0
        } days of stock remain.`,
        recommendation: 'Review reorder quantity and supplier lead time.',
      });
    } else if (m.isHighUsage) {
      usageAlerts.push({
        type: 'high_usage',
        medicine: m,
        title: `High Usage Detected: ${m.medicineName}`,
        message: `${m.medicineName} has been dispensed frequently in the selected period (${m.totalUnitsUsed} ${m.unit} used, avg ${m.avgDailyUsage}/day).`,
        recommendation: 'Consider maintaining a higher safety stock and reviewing the reorder quantity.',
      });
    }

    if (m.trendDirection === 'increasing' && m.trendMessage && !m.isUrgentReorder) {
      usageAlerts.push({
        type: 'increasing_demand',
        medicine: m,
        title: `Demand Increasing: ${m.medicineName}`,
        message: m.trendMessage,
        recommendation: 'Monitor consumption rate and prepare replenishment orders in advance.',
      });
    }
  }

  return {
    metrics,
    totalDispensedInPeriod,
    totalTransactionsInPeriod,
    highUsageCount,
    urgentReorderCount,
    fastMovingMedicines,
    usageAlerts,
  };
}
