import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  loadDatabase,
  saveDatabase,
  sendJson,
  parseBody,
  setCORS,
} from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const body = await parseBody(req);
    const { email } = body;

    if (!email) {
      sendJson(res, 400, { error: 'Email is required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = loadDatabase();
    const userIndex = db.users.findIndex((u) => u.email === cleanEmail);

    if (userIndex === -1) {
      sendJson(res, 200, {
        success: true,
        message: 'If an account exists with this email, a reset code has been issued.',
      });
      return;
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.users[userIndex].resetToken = resetCode;
    db.users[userIndex].resetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    saveDatabase(db);

    sendJson(res, 200, {
      success: true,
      message: 'Password reset code generated.',
      devResetCode: resetCode,
    });
  } catch (err: any) {
    sendJson(res, 500, { error: 'Failed to process forgot password.' });
  }
}
