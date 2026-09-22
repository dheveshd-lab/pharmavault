import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  loadDatabase,
  getAuthenticatedUser,
  sendJson,
  setCORS,
} from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const db = loadDatabase();
  const user = getAuthenticatedUser(req, db);

  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized: Session invalid or expired.' });
    return;
  }

  sendJson(res, 200, {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
    },
  });
}
