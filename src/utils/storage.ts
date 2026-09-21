import { AppData, Batch, DispensingRecord, Medicine, Supplier } from '../types';

const STORAGE_KEY = 'pharmacy_inventory_v1';

export const INITIAL_EMPTY_DATA: AppData = {
  medicines: [],
  batches: [],
  suppliers: [],
  dispensingRecords: [],
  isDemoData: false,
};

export function getInitialOrStoredData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Clean start: STRICTLY EMPTY
      return INITIAL_EMPTY_DATA;
    }
    const parsed = JSON.parse(raw);
    return {
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
      batches: Array.isArray(parsed.batches) ? parsed.batches : [],
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      dispensingRecords: Array.isArray(parsed.dispensingRecords) ? parsed.dispensingRecords : [],
      isDemoData: Boolean(parsed.isDemoData),
    };
  } catch (err) {
    console.warn('Failed to parse stored inventory data, defaulting to empty state:', err);
    return INITIAL_EMPTY_DATA;
  }
}

export function persistAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Generates optional sample demo data ONLY when explicitly requested by the user.
 * Never loaded automatically on fresh startup.
 */
export function generateDemoDataset(): AppData {
  const now = new Date();

  // Helper date formatter YYYY-MM-DD
  const formatOffset = (days: number): string => {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const suppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'PharmaCore Distribution Ltd.',
      contactPerson: 'David Chen',
      phone: '+1 (555) 234-8901',
      email: 'orders@pharmacore-demo.com',
      address: '742 Healthcare Parkway, Logistics Hub',
      leadTimeDays: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sup-2',
      name: 'Apex BioLogics Corp',
      contactPerson: 'Sarah Jenkins',
      phone: '+1 (555) 876-5432',
      email: 'supply@apexbiologics-demo.com',
      address: '120 Science Park Blvd, Suite 400',
      leadTimeDays: 5,
      createdAt: new Date().toISOString(),
    },
  ];

  const medicines: Medicine[] = [
    {
      id: 'med-demo-1',
      name: 'Azithromycin Oral Suspension',
      genericName: 'Azithromycin Dihemihydrate',
      category: 'Antibiotics',
      dosageForm: 'Syrup/Suspension',
      strength: '200 mg / 5 mL',
      unit: 'Bottle (15 mL)',
      minStockLevel: 25,
      description: 'Macrolide antibiotic indicated for mild-to-moderate respiratory and skin infections.',
      status: 'Active',
      createdAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-demo-2',
      name: 'Metformin Hydrochloride XR',
      genericName: 'Metformin HCl',
      category: 'Antidiabetic',
      dosageForm: 'Tablet',
      strength: '500 mg',
      unit: 'Box of 100 Tablets',
      minStockLevel: 40,
      description: 'Extended-release biguanide for type 2 diabetes mellitus glycemic control.',
      status: 'Active',
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-demo-3',
      name: 'Salbutamol HFA Inhaler',
      genericName: 'Albuterol Sulfate',
      category: 'Respiratory',
      dosageForm: 'Inhaler',
      strength: '100 mcg / dose',
      unit: 'Canister (200 actuations)',
      minStockLevel: 15,
      description: 'Short-acting beta2-adrenergic agonist for acute bronchospasm relief.',
      status: 'Active',
      createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const batches: Batch[] = [
    // Azithromycin batch 1: Expiring in 20 days (Critical/Near Expiry to test FEFO)
    {
      id: 'batch-demo-1',
      medicineId: 'med-demo-1',
      medicineName: 'Azithromycin Oral Suspension',
      batchNumber: 'AZ-2026-01',
      quantity: 12,
      initialQuantity: 30,
      manufacturingDate: formatOffset(-180),
      expiryDate: formatOffset(20),
      supplierId: 'sup-1',
      supplierName: 'PharmaCore Distribution Ltd.',
      purchasePrice: 6.5,
      sellingPrice: 12.0,
      createdAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
    },
    // Azithromycin batch 2: Expiring in 240 days (Good)
    {
      id: 'batch-demo-2',
      medicineId: 'med-demo-1',
      medicineName: 'Azithromycin Oral Suspension',
      batchNumber: 'AZ-2026-02',
      quantity: 25,
      initialQuantity: 25,
      manufacturingDate: formatOffset(-30),
      expiryDate: formatOffset(240),
      supplierId: 'sup-1',
      supplierName: 'PharmaCore Distribution Ltd.',
      purchasePrice: 6.2,
      sellingPrice: 12.0,
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
    },
    // Metformin batch: 15 units (Low stock: min is 40 -> triggers Reorder alert!)
    {
      id: 'batch-demo-3',
      medicineId: 'med-demo-2',
      medicineName: 'Metformin Hydrochloride XR',
      batchNumber: 'MET-89B',
      quantity: 15,
      initialQuantity: 50,
      manufacturingDate: formatOffset(-100),
      expiryDate: formatOffset(365),
      supplierId: 'sup-2',
      supplierName: 'Apex BioLogics Corp',
      purchasePrice: 4.0,
      sellingPrice: 8.5,
      createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    },
    // Salbutamol batch: 18 units
    {
      id: 'batch-demo-4',
      medicineId: 'med-demo-3',
      medicineName: 'Salbutamol HFA Inhaler',
      batchNumber: 'SLB-049',
      quantity: 18,
      initialQuantity: 20,
      manufacturingDate: formatOffset(-60),
      expiryDate: formatOffset(400),
      supplierId: 'sup-2',
      supplierName: 'Apex BioLogics Corp',
      purchasePrice: 9.0,
      sellingPrice: 16.5,
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    },
  ];

  const dispensingRecords: DispensingRecord[] = [
    {
      id: 'disp-demo-1',
      medicineId: 'med-demo-1',
      medicineName: 'Azithromycin Oral Suspension',
      quantity: 5,
      batchAllocations: [
        {
          batchId: 'batch-demo-1',
          batchNumber: 'AZ-2026-01',
          expiryDate: formatOffset(20),
          quantity: 5,
        },
      ],
      patientName: 'Elena Rostova',
      prescriptionNumber: 'RX-9821',
      prescribedBy: 'Dr. Marcus Vance, MD',
      notes: 'Take 5 mL once daily for 3 days after meals.',
      dispensedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      unitPrice: 12.0,
      totalAmount: 60.0,
    },
    {
      id: 'disp-demo-2',
      medicineId: 'med-demo-1',
      medicineName: 'Azithromycin Oral Suspension',
      quantity: 8,
      batchAllocations: [
        {
          batchId: 'batch-demo-1',
          batchNumber: 'AZ-2026-01',
          expiryDate: formatOffset(20),
          quantity: 8,
        },
      ],
      patientName: 'Michael Chang',
      prescriptionNumber: 'RX-9834',
      prescribedBy: 'Dr. Sarah Connor, MD',
      notes: 'Acute respiratory infection protocol.',
      dispensedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      unitPrice: 12.0,
      totalAmount: 96.0,
    },
    {
      id: 'disp-demo-3',
      medicineId: 'med-demo-1',
      medicineName: 'Azithromycin Oral Suspension',
      quantity: 12,
      batchAllocations: [
        {
          batchId: 'batch-demo-1',
          batchNumber: 'AZ-2026-01',
          expiryDate: formatOffset(20),
          quantity: 12,
        },
      ],
      patientName: 'Sophia Patel',
      prescriptionNumber: 'RX-9849',
      prescribedBy: 'Dr. John Miller, MD',
      notes: 'Pediatric dosage completed.',
      dispensedAt: new Date(now.getTime() - 11 * 86400000).toISOString(),
      unitPrice: 12.0,
      totalAmount: 144.0,
    },
    {
      id: 'disp-demo-4',
      medicineId: 'med-demo-2',
      medicineName: 'Metformin Hydrochloride',
      quantity: 40,
      batchAllocations: [
        {
          batchId: 'batch-demo-2',
          batchNumber: 'MET-8911',
          expiryDate: formatOffset(180),
          quantity: 40,
        },
      ],
      patientName: 'Robert Johnson',
      prescriptionNumber: 'RX-9770',
      prescribedBy: 'Dr. Anita Roy, MD',
      notes: 'Take 1 tablet twice daily with meals.',
      dispensedAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      unitPrice: 0.25,
      totalAmount: 10.0,
    },
    {
      id: 'disp-demo-5',
      medicineId: 'med-demo-2',
      medicineName: 'Metformin Hydrochloride',
      quantity: 50,
      batchAllocations: [
        {
          batchId: 'batch-demo-2',
          batchNumber: 'MET-8911',
          expiryDate: formatOffset(180),
          quantity: 50,
        },
      ],
      patientName: 'David Lee',
      prescriptionNumber: 'RX-9801',
      prescribedBy: 'Dr. Anita Roy, MD',
      notes: 'Monthly diabetes maintenance regimen.',
      dispensedAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
      unitPrice: 0.25,
      totalAmount: 12.5,
    },
    {
      id: 'disp-demo-6',
      medicineId: 'med-demo-3',
      medicineName: 'Atorvastatin Calcium',
      quantity: 10,
      batchAllocations: [
        {
          batchId: 'batch-demo-4',
          batchNumber: 'ATV-3011',
          expiryDate: formatOffset(400),
          quantity: 10,
        },
      ],
      patientName: 'Grace Hopper',
      prescriptionNumber: 'RX-9712',
      prescribedBy: 'Dr. Marcus Vance, MD',
      notes: 'Take 1 tablet at bedtime.',
      dispensedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
      unitPrice: 0.8,
      totalAmount: 8.0,
    },
  ];

  return {
    medicines,
    batches,
    suppliers,
    dispensingRecords,
    isDemoData: true,
  };
}
