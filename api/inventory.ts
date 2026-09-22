import {
  loadDatabase,
  saveDatabase,
  getAuthenticatedUser,
  sendJson,
  parseBody,
  setCORS,
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
    sendJson(res, 401, { error: 'Unauthorized: Session invalid or expired.' });
    return;
  }

  const userId = user.id;

  if (req.method === 'GET') {
    const userMedicines = db.medicines.filter((m) => m.userId === userId);
    const userBatches = db.batches.filter((b) => b.userId === userId);
    const userSuppliers = db.suppliers.filter((s) => s.userId === userId);
    const userDispensing = db.dispensingRecords.filter((d) => d.userId === userId);

    sendJson(res, 200, {
      medicines: userMedicines,
      batches: userBatches,
      suppliers: userSuppliers,
      dispensingRecords: userDispensing,
      isDemoData: false,
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { medicines, batches, suppliers, dispensingRecords } = body;

      // Filter out previous data for this user
      db.medicines = db.medicines.filter((m) => m.userId !== userId);
      db.batches = db.batches.filter((b) => b.userId !== userId);
      db.suppliers = db.suppliers.filter((s) => s.userId !== userId);
      db.dispensingRecords = db.dispensingRecords.filter((d) => d.userId !== userId);

      if (Array.isArray(medicines)) {
        medicines.forEach((m: any) => {
          db.medicines.push({ ...m, userId });
        });
      }
      if (Array.isArray(batches)) {
        batches.forEach((b: any) => {
          db.batches.push({ ...b, userId });
        });
      }
      if (Array.isArray(suppliers)) {
        suppliers.forEach((s: any) => {
          db.suppliers.push({ ...s, userId });
        });
      }
      if (Array.isArray(dispensingRecords)) {
        dispensingRecords.forEach((d: any) => {
          db.dispensingRecords.push({ ...d, userId });
        });
      }

      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Inventory synchronized successfully.' });
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to synchronize inventory.' });
    }
    return;
  }

  sendJson(res, 405, { error: 'Method Not Allowed.' });
}
