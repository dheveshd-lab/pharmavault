export type MedicineStatus = 'Active' | 'Discontinued' | 'Inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface Medicine {
  id: string;
  userId?: string;
  name: string; // Medicine Name *
  genericName?: string;
  category: string; // Category *
  dosageForm: string; // Dosage/Form *
  strength?: string;
  unit?: string;
  minStockLevel: number; // Minimum Stock Level *
  description?: string;
  status: MedicineStatus;
  imageUrl?: string; // Medicine image URL or data URI
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  userId?: string;
  medicineId: string; // Medicine: Automatically selected
  medicine_id?: string; // Database relationship alias
  medicineName: string;
  batchNumber: string; // Batch Number *
  quantity: number; // Quantity *
  initialQuantity: number;
  manufacturingDate?: string;
  expiryDate: string; // Expiry Date *
  supplierId: string; // Supplier *
  supplier_id?: string; // Database relationship alias
  supplierName: string;
  purchasePrice?: number;
  sellingPrice?: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  userId?: string;
  name: string; // Supplier Name *
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  leadTimeDays: number; // Lead Time (days) *
  createdAt: string;
}

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface DispensingRecord {
  id: string;
  userId?: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  batchAllocations: BatchAllocation[];
  patientName?: string;
  prescriptionNumber?: string;
  prescribedBy?: string;
  notes?: string;
  dispensedAt: string;
  unitPrice?: number;
  totalAmount?: number;
}

export type ExpiryStatusType = 'EXPIRED' | 'CRITICAL' | 'NEAR_EXPIRY' | 'GOOD';

export interface ExpiryAnalysis {
  status: ExpiryStatusType;
  daysRemaining: number;
  label: string;
  badgeClass: string;
}

export interface ReorderRecommendation {
  medicine: Medicine;
  currentStock: number;
  minStockLevel: number;
  deficit: number;
  suggestedReorderQuantity: number;
  preferredSupplier?: Supplier;
  estimatedDemandDuringLeadTime?: number;
  safetyStockBuffer?: number;
  isUsageInformed?: boolean;
}

export type UsagePeriodFilter = '7d' | '30d' | '60d' | '90d' | 'custom';

export type UsageClassification = 'HIGH USAGE' | 'MODERATE' | 'LOW USAGE' | 'NO RECENT USAGE';

export type UsageTrendDirection = 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';

export interface MedicineUsageMetrics {
  medicineId: string;
  medicineName: string;
  genericName?: string;
  category?: string;
  unit?: string;
  totalUnitsUsed: number;
  avgDailyUsage: number;
  transactionCount: number;
  currentStock: number;
  minStockLevel: number;
  estimatedDaysRemaining: number | null; // null if avgDailyUsage === 0
  previousPeriodUnits: number;
  usageChangePercent: number | null; // null if insufficient historical data
  trendDirection: UsageTrendDirection;
  trendMessage?: string;
  classification: UsageClassification;
  isHighUsage: boolean;
  isUrgentReorder: boolean;
  urgentMessage?: string;
  suggestedAction?: string;
  suggestedReorderQuantity: number;
  preferredSupplier?: Supplier;
  supplierLeadTimeDays: number;
  demandDuringLeadTime: number;
  safetyStockBuffer: number;
  regressionSlope: number | null; // change in units per day
  projectedDailyDemand: number | null;
  dailyBreakdown: { date: string; quantity: number }[];
}

export interface UsagePeriodConfig {
  filter: UsagePeriodFilter;
  startDate: string; // ISO string
  endDate: string; // ISO string
  daysCount: number;
  previousStartDate: string;
  previousEndDate: string;
}

export interface AppData {
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  dispensingRecords: DispensingRecord[];
  isDemoData: boolean;
}
