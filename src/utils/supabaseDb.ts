import { Batch, BatchAllocation, DispensingRecord, Medicine, PaymentRecord, SalesBill, SalesBillItem, Supplier, UserProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';

export interface SupabaseSyncResult<T> {
  data: T | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// PROFILE
// ---------------------------------------------------------------------------
export async function fetchRemoteProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name || '',
    pharmacyName: data.pharmacy_name || 'PharmaVault',
    licenseNumber: data.license_number || '',
    phone: data.phone || '',
    currency: data.currency || 'INR',
    taxRatePercent: Number(data.tax_rate_percent || 12),
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function upsertRemoteProfile(profile: UserProfile): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('profiles').upsert({
    id: profile.id,
    full_name: profile.fullName,
    pharmacy_name: profile.pharmacyName,
    license_number: profile.licenseNumber,
    phone: profile.phone,
    currency: profile.currency,
    tax_rate_percent: profile.taxRatePercent,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

// ---------------------------------------------------------------------------
// MEDICINES
// ---------------------------------------------------------------------------
export async function fetchRemoteMedicines(userId: string): Promise<Medicine[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('medicines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    genericName: row.generic_name || undefined,
    category: row.category,
    dosageForm: row.dosage_form,
    strength: row.strength || undefined,
    unit: row.unit || undefined,
    minStockLevel: row.min_stock_level,
    description: row.description || undefined,
    status: row.status,
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveRemoteMedicine(userId: string, medicine: Medicine): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const payload = {
    id: medicine.id,
    user_id: userId,
    name: medicine.name,
    generic_name: medicine.genericName || null,
    category: medicine.category,
    dosage_form: medicine.dosageForm,
    strength: medicine.strength || null,
    unit: medicine.unit || null,
    min_stock_level: medicine.minStockLevel,
    description: medicine.description || null,
    image_url: medicine.imageUrl || null,
    status: medicine.status,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('medicines').upsert(payload);
  return !error;
}

export async function deleteRemoteMedicine(userId: string, medicineId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('medicines')
    .delete()
    .eq('id', medicineId)
    .eq('user_id', userId);

  return !error;
}

// ---------------------------------------------------------------------------
// SUPPLIERS
// ---------------------------------------------------------------------------
export async function fetchRemoteSuppliers(userId: string): Promise<Supplier[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('suppliers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    leadTimeDays: row.lead_time_days,
    createdAt: row.created_at,
  }));
}

export async function saveRemoteSupplier(userId: string, supplier: Supplier): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const payload = {
    id: supplier.id,
    user_id: userId,
    name: supplier.name,
    contact_person: supplier.contactPerson || null,
    phone: supplier.phone || null,
    email: supplier.email || null,
    address: supplier.address || null,
    lead_time_days: supplier.leadTimeDays,
    status: 'Active',
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('suppliers').upsert(payload);
  return !error;
}

export async function deleteRemoteSupplier(userId: string, supplierId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('suppliers')
    .delete()
    .eq('id', supplierId)
    .eq('user_id', userId);

  return !error;
}

// ---------------------------------------------------------------------------
// BATCHES
// ---------------------------------------------------------------------------
export async function fetchRemoteBatches(userId: string): Promise<Batch[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('batches')
    .select('*, medicines(name), suppliers(name)')
    .eq('user_id', userId)
    .order('expiry_date', { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    medicineId: row.medicine_id,
    medicineName: row.medicines?.name || 'Unknown Medicine',
    batchNumber: row.batch_number,
    quantity: row.quantity,
    initialQuantity: row.initial_quantity,
    manufacturingDate: row.manufacturing_date || undefined,
    expiryDate: row.expiry_date,
    supplierId: row.supplier_id || '',
    supplierName: row.suppliers?.name || 'Standard Distribution',
    purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : undefined,
    sellingPrice: row.selling_price != null ? Number(row.selling_price) : undefined,
    createdAt: row.created_at,
  }));
}

export async function saveRemoteBatch(userId: string, batch: Batch): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const payload = {
    id: batch.id,
    user_id: userId,
    medicine_id: batch.medicineId,
    supplier_id: batch.supplierId || null,
    batch_number: batch.batchNumber,
    quantity: batch.quantity,
    initial_quantity: batch.initialQuantity,
    manufacturing_date: batch.manufacturingDate || null,
    expiry_date: batch.expiryDate,
    purchase_price: batch.purchasePrice ?? null,
    selling_price: batch.sellingPrice ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('batches').upsert(payload);
  return !error;
}

export async function deleteRemoteBatch(userId: string, batchId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('batches')
    .delete()
    .eq('id', batchId)
    .eq('user_id', userId);

  return !error;
}

export async function deductBatchQuantitiesRemote(
  userId: string,
  allocations: { batchId: string; quantity: number }[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  for (const alloc of allocations) {
    // Read current quantity to ensure no negative stock
    const { data: current } = await client
      .from('batches')
      .select('quantity')
      .eq('id', alloc.batchId)
      .eq('user_id', userId)
      .single();

    if (current) {
      const nextQty = Math.max(0, current.quantity - alloc.quantity);
      await client
        .from('batches')
        .update({ quantity: nextQty, updated_at: new Date().toISOString() })
        .eq('id', alloc.batchId)
        .eq('user_id', userId);
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// DISPENSING
// ---------------------------------------------------------------------------
export async function fetchRemoteDispensingRecords(userId: string): Promise<DispensingRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: dispData, error: dispError } = await client
    .from('dispensing_records')
    .select('*, dispensing_batch_allocations(*)')
    .eq('user_id', userId)
    .order('dispensed_at', { ascending: false });

  if (dispError || !dispData) return [];

  return dispData.map((row: any) => ({
    id: row.id,
    medicineId: row.medicine_id,
    medicineName: row.medicine_name,
    quantity: row.quantity,
    patientName: row.patient_name || undefined,
    prescriptionNumber: row.prescription_number || undefined,
    prescribedBy: row.prescribed_by || undefined,
    notes: row.notes || undefined,
    dispensedAt: row.dispensed_at,
    unitPrice: row.unit_price != null ? Number(row.unit_price) : undefined,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : undefined,
    batchAllocations: Array.isArray(row.dispensing_batch_allocations)
      ? row.dispensing_batch_allocations.map((alloc: any) => ({
          batchId: alloc.batch_id,
          batchNumber: alloc.batch_number,
          expiryDate: alloc.expiry_date,
          quantity: alloc.quantity,
        }))
      : [],
  }));
}

export async function saveRemoteDispensingRecord(
  userId: string,
  record: DispensingRecord
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const dispPayload = {
    id: record.id,
    user_id: userId,
    medicine_id: record.medicineId,
    medicine_name: record.medicineName,
    quantity: record.quantity,
    patient_name: record.patientName || null,
    prescription_number: record.prescriptionNumber || null,
    prescribed_by: record.prescribedBy || null,
    notes: record.notes || null,
    dispensed_at: record.dispensedAt,
    unit_price: record.unitPrice ?? null,
    total_amount: record.totalAmount ?? null,
  };

  const { error: dispErr } = await client.from('dispensing_records').insert(dispPayload);
  if (dispErr) return false;

  // Insert allocations
  if (record.batchAllocations.length > 0) {
    const allocPayload = record.batchAllocations.map((alloc) => ({
      id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dispensing_id: record.id,
      batch_id: alloc.batchId,
      batch_number: alloc.batchNumber,
      expiry_date: alloc.expiryDate,
      quantity: alloc.quantity,
    }));
    await client.from('dispensing_batch_allocations').insert(allocPayload);
  }

  // Deduct from batches
  await deductBatchQuantitiesRemote(
    userId,
    record.batchAllocations.map((a) => ({ batchId: a.batchId, quantity: a.quantity }))
  );

  return true;
}

// ---------------------------------------------------------------------------
// SALES BILLS & INVOICES
// ---------------------------------------------------------------------------
export async function fetchRemoteSalesBills(userId: string): Promise<SalesBill[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: bills, error } = await client
    .from('sales_bills')
    .select('*, sales_bill_items(*), payment_records(*)')
    .eq('user_id', userId)
    .order('bill_date', { ascending: false });

  if (error || !bills) return [];

  return bills.map((b: any) => ({
    id: b.id,
    billNumber: b.bill_number,
    customerName: b.customer_name || undefined,
    customerPhone: b.customer_phone || undefined,
    billDate: b.bill_date,
    subtotal: Number(b.subtotal),
    discountAmount: Number(b.discount_amount),
    taxAmount: Number(b.tax_amount),
    taxRatePercent: Number(b.tax_rate_percent),
    grandTotal: Number(b.grand_total),
    amountPaid: Number(b.amount_paid),
    paymentStatus: b.payment_status,
    paymentMethod: b.payment_method,
    notes: b.notes || undefined,
    status: b.status,
    createdAt: b.created_at,
    items: Array.isArray(b.sales_bill_items)
      ? b.sales_bill_items.map((i: any) => ({
          id: i.id,
          billId: i.bill_id,
          medicineId: i.medicine_id,
          batchId: i.batch_id,
          medicineNameSnapshot: i.medicine_name_snapshot,
          batchNumberSnapshot: i.batch_number_snapshot,
          expiryDateSnapshot: i.expiry_date_snapshot,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          discountAmount: Number(i.discount_amount),
          taxAmount: Number(i.tax_amount),
          lineTotal: Number(i.line_total),
        }))
      : [],
    payments: Array.isArray(b.payment_records)
      ? b.payment_records.map((p: any) => ({
          id: p.id,
          billId: p.bill_id,
          amount: Number(p.amount),
          paymentMethod: p.payment_method,
          paymentDate: p.payment_date,
          reference: p.reference || undefined,
          status: p.status,
          notes: p.notes || undefined,
        }))
      : [],
  }));
}

export async function saveRemoteSalesBill(userId: string, bill: SalesBill): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const billPayload = {
    id: bill.id,
    user_id: userId,
    bill_number: bill.billNumber,
    customer_name: bill.customerName || null,
    customer_phone: bill.customerPhone || null,
    bill_date: bill.billDate,
    subtotal: bill.subtotal,
    discount_amount: bill.discountAmount,
    tax_amount: bill.taxAmount,
    tax_rate_percent: bill.taxRatePercent,
    grand_total: bill.grandTotal,
    amount_paid: bill.amountPaid,
    payment_status: bill.paymentStatus,
    payment_method: bill.paymentMethod,
    notes: bill.notes || null,
    status: bill.status,
  };

  const { error: billErr } = await client.from('sales_bills').insert(billPayload);
  if (billErr) return false;

  // Insert items
  if (bill.items.length > 0) {
    const itemsPayload = bill.items.map((item) => ({
      id: item.id,
      user_id: userId,
      bill_id: bill.id,
      medicine_id: item.medicineId,
      batch_id: item.batchId,
      medicine_name_snapshot: item.medicineNameSnapshot,
      batch_number_snapshot: item.batchNumberSnapshot,
      expiry_date_snapshot: item.expiryDateSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount_amount: item.discountAmount,
      tax_amount: item.taxAmount,
      line_total: item.lineTotal,
    }));
    await client.from('sales_bill_items').insert(itemsPayload);
  }

  // Insert payment record if payment was made
  if (bill.amountPaid > 0) {
    await client.from('payment_records').insert({
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      bill_id: bill.id,
      amount: bill.amountPaid,
      payment_method: bill.paymentMethod,
      payment_date: bill.billDate,
      reference: `Bill #${bill.billNumber}`,
      status: 'Completed',
    });
  }

  // Deduct inventory for all items in the bill atomically
  await deductBatchQuantitiesRemote(
    userId,
    bill.items.map((i) => ({ batchId: i.batchId, quantity: i.quantity }))
  );

  return true;
}

export async function refundOrCancelRemoteBill(
  userId: string,
  bill: SalesBill,
  restoreStock: boolean
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  // Update bill status
  await client
    .from('sales_bills')
    .update({
      status: 'Cancelled',
      payment_status: 'Refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bill.id)
    .eq('user_id', userId);

  // If restoring stock, add items back to batches
  if (restoreStock && bill.items.length > 0) {
    for (const item of bill.items) {
      const { data: batch } = await client
        .from('batches')
        .select('quantity')
        .eq('id', item.batchId)
        .eq('user_id', userId)
        .single();

      if (batch) {
        await client
          .from('batches')
          .update({
            quantity: batch.quantity + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.batchId)
          .eq('user_id', userId);
      }
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// STORAGE: MEDICINE IMAGES
// ---------------------------------------------------------------------------
export async function uploadMedicineImage(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { url: null, error: 'Supabase client is not configured' };
  }

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await client.storage
      .from('medicine-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = client.storage.from('medicine-images').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Failed to upload image' };
  }
}
