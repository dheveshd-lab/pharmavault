import type { IncomingMessage, ServerResponse } from 'http';
import {
  loadDatabase,
  saveDatabase,
  comparePassword,
  generateToken,
  sendJson,
  parseBody,
  setCORS,
} from '../_lib/db';

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

  try {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      sendJson(res, 400, { error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const db = loadDatabase();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (!user) {
      sendJson(res, 401, {
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.',
      });
      return;
    }

    const isMatch = await comparePassword(String(password), user.passwordHash);
    if (!isMatch) {
      sendJson(res, 401, {
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.',
      });
      return;
    }

    // Create 30-day session
    const token = generateToken();
    const session = {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    db.sessions.push(session);
    saveDatabase(db);

    sendJson(res, 200, {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error in Vercel function:', err);
    sendJson(res, 500, {
      error: 'An internal error occurred during login. Please try again.',
      message: err.message,
    });
  }
}
