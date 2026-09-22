import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  loadDatabase,
  saveDatabase,
  hashPassword,
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
    const { email, resetCode, newPassword } = body;

    if (!email || !resetCode || !newPassword) {
      sendJson(res, 400, { error: 'Missing required reset fields.' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      sendJson(res, 400, { error: 'New password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = loadDatabase();
    const userIndex = db.users.findIndex((u) => u.email === cleanEmail);

    if (userIndex === -1) {
      sendJson(res, 400, { error: 'Invalid or expired reset code.' });
      return;
    }

    const user = db.users[userIndex];
    if (
      !user.resetToken ||
      user.resetToken !== String(resetCode).trim() ||
      !user.resetTokenExpires ||
      user.resetTokenExpires < Date.now()
    ) {
      sendJson(res, 400, { error: 'Invalid or expired reset code.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    db.users[userIndex].passwordHash = newHash;
    delete db.users[userIndex].resetToken;
    delete db.users[userIndex].resetTokenExpires;

    // Invalidate old sessions
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    saveDatabase(db);

    sendJson(res, 200, {
      success: true,
      message: 'Password has been reset successfully. You can now login.',
    });
  } catch (err: any) {
    sendJson(res, 500, { error: 'Failed to reset password.' });
  }
}
