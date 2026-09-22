import {
  loadDatabase,
  saveDatabase,
  sendJson,
  setCORS,
} from '../_lib/db';

export default async function handler(req: any, res: any): Promise<void> {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (token) {
    try {
      const db = loadDatabase();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveDatabase(db);
    } catch (err) {
      console.warn('Logout session clear warning:', err);
    }
  }

  sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
}
