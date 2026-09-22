import {
  loadDatabase,
  saveDatabase,
  getAuthenticatedUser,
  sendJson,
  parseBody,
  setCORS,
  StoredBatch,
} from './_lib/db';

export default async function handler(req: any, res: any): Promise<void> {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const db = loadDatabase();
  const user = getAuthenticatedUser(req, db);

  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized.' });
    return;
  }

  const userId = user.id;

  if (req.method === 'POST') {
    try {
      const batch = await parseBody(req);
      const resolvedMedicineId = batch.medicineId || batch.medicine_id;
      const resolvedSupplierId = batch.supplierId || batch.supplier_id || '';

      if (!resolvedMedicineId || !batch.batchNumber || !batch.expiryDate || batch.quantity === undefined) {
        sendJson(res, 400, { error: 'Missing required batch fields.' });
        return;
      }

      const cleanBatch: StoredBatch = {
        ...batch,
        userId,
        medicineId: resolvedMedicineId,
        medicine_id: resolvedMedicineId,
        supplierId: resolvedSupplierId,
        supplier_id: resolvedSupplierId,
        createdAt: batch.createdAt || new Date().toISOString(),
      };

      const existingIdx = db.batches.findIndex((b) => b.id === batch.id && b.userId === userId);
      if (existingIdx >= 0) {
        db.batches[existingIdx] = cleanBatch;
      } else {
        db.batches.unshift(cleanBatch);
      }

      saveDatabase(db);
      sendJson(res, 200, { batch: cleanBatch });
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to save batch.' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.url?.split('/').pop()?.split('?')[0];
    if (!id) {
      sendJson(res, 400, { error: 'Batch ID is required.' });
      return;
    }

    db.batches = db.batches.filter((b) => !(b.id === id && b.userId === userId));
    saveDatabase(db);
    sendJson(res, 200, { success: true, message: 'Batch deleted.' });
    return;
  }

  sendJson(res, 405, { error: 'Method Not Allowed.' });
}
