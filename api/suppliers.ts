import {
  loadDatabase,
  saveDatabase,
  getAuthenticatedUser,
  sendJson,
  parseBody,
  setCORS,
  StoredSupplier,
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
      const supplier = await parseBody(req);
      if (!supplier.name) {
        sendJson(res, 400, { error: 'Supplier name is required.' });
        return;
      }

      const cleanSupplier: StoredSupplier = {
        ...supplier,
        userId,
        createdAt: supplier.createdAt || new Date().toISOString(),
      };

      const existingIdx = db.suppliers.findIndex((s) => s.id === supplier.id && s.userId === userId);
      if (existingIdx >= 0) {
        db.suppliers[existingIdx] = cleanSupplier;
      } else {
        db.suppliers.unshift(cleanSupplier);
      }

      saveDatabase(db);
      sendJson(res, 200, { supplier: cleanSupplier });
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to save supplier.' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.url?.split('/').pop()?.split('?')[0];
    if (!id) {
      sendJson(res, 400, { error: 'Supplier ID is required.' });
      return;
    }

    db.suppliers = db.suppliers.filter((s) => !(s.id === id && s.userId === userId));
    saveDatabase(db);
    sendJson(res, 200, { success: true, message: 'Supplier deleted.' });
    return;
  }

  sendJson(res, 405, { error: 'Method Not Allowed.' });
}
