import {
  loadDatabase,
  getAuthenticatedUser,
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
