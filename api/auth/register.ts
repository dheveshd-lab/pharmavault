import {
  loadDatabase,
  saveDatabase,
  hashPassword,
  generateToken,
  sendJson,
  parseBody,
  setCORS,
  StoredUser,
} from '../_lib/db';
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

  try {
    const body = await parseBody(req);
    const { name, email, password } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      sendJson(res, 400, { error: 'Full name must be at least 2 characters.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      sendJson(res, 400, { error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = loadDatabase();

    if (db.users.some((u) => u.email === cleanEmail)) {
      sendJson(res, 409, { error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    const token = generateToken();
    const session = {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    db.sessions.push(session);
    saveDatabase(db);

    sendJson(res, 201, {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        avatarUrl: newUser.avatarUrl,
      },
      token,
    });
  } catch (err: any) {
    console.error('Registration error in Vercel function:', err);
    sendJson(res, 500, {
      error: 'An internal error occurred during registration. Please try again.',
      message: err.message,
    });
  }
}
