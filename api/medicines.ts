import {
  loadDatabase,
  saveDatabase,
  getAuthenticatedUser,
  sendJson,
  parseBody,
  setCORS,
  StoredMedicine,
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
      const medicine = await parseBody(req);
      if (!medicine.name || !medicine.category || !medicine.dosageForm) {
        sendJson(res, 400, { error: 'Missing required medicine fields.' });
        return;
      }

      const existingIdx = db.medicines.findIndex((m) => m.id === medicine.id && m.userId === userId);
      const cleanMed: StoredMedicine = {
        ...medicine,
        userId,
        updatedAt: new Date().toISOString(),
        createdAt: medicine.createdAt || new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        db.medicines[existingIdx] = cleanMed;
      } else {
        db.medicines.unshift(cleanMed);
      }

      saveDatabase(db);
      sendJson(res, 200, { medicine: cleanMed });
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to save medicine.' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.url?.split('/').pop()?.split('?')[0];
    if (!id) {
      sendJson(res, 400, { error: 'Medicine ID is required.' });
      return;
    }

    db.medicines = db.medicines.filter((m) => !(m.id === id && m.userId === userId));
    db.batches = db.batches.filter((b) => !(b.medicineId === id && b.userId === userId));
    saveDatabase(db);
    sendJson(res, 200, { success: true, message: 'Medicine and associated batches deleted.' });
    return;
  }

  sendJson(res, 405, { error: 'Method Not Allowed.' });
}
