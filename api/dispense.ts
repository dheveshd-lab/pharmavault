import {
  loadDatabase,
  saveDatabase,
  getAuthenticatedUser,
  sendJson,
  parseBody,
  setCORS,
  StoredDispensingRecord,
} from './_lib/db';
import crypto from 'crypto';

export default async function handler(req: any, res: any): Promise<void> {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const db = loadDatabase();
  const user = getAuthenticatedUser(req, db);

  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized.' });
    return;
  }

  const userId = user.id;

  try {
    const body = await parseBody(req);
    const { record, updatedBatches } = body;

    if (!record || !record.medicineId || !record.quantity) {
      sendJson(res, 400, { error: 'Missing dispensing record information.' });
      return;
    }

    // Apply batch quantity updates with strict userId check
    if (Array.isArray(updatedBatches)) {
      for (const ub of updatedBatches) {
        const batchIdx = db.batches.findIndex((b) => b.id === ub.id && b.userId === userId);
        if (batchIdx >= 0) {
          db.batches[batchIdx].quantity = Math.max(0, ub.quantity);
        }
      }
    }

    const newRecord: StoredDispensingRecord = {
      ...record,
      id: record.id || `disp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      dispensedAt: record.dispensedAt || new Date().toISOString(),
    };

    db.dispensingRecords.unshift(newRecord);
    saveDatabase(db);

    sendJson(res, 201, { success: true, record: newRecord });
  } catch (err: any) {
    sendJson(res, 500, { error: 'Failed to record dispensing transaction.' });
  }
}
