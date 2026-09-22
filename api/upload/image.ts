import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  loadDatabase,
  getAuthenticatedUser,
  sendJson,
  parseBody,
  setCORS,
  UPLOADS_DIR,
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

  const db = loadDatabase();
  const user = getAuthenticatedUser(req, db);

  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized.' });
    return;
  }

  try {
    const body = await parseBody(req);
    const { imageBase64, filename } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      sendJson(res, 400, { error: 'Missing imageBase64 data.' });
      return;
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let extension = 'png';
    let base64Data = imageBase64;

    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      base64Data = matches[2];
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
      else if (mimeType.includes('webp')) extension = 'webp';
      else if (mimeType.includes('gif')) extension = 'gif';
    }

    const fileId = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileId);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // On serverless, if UPLOADS_DIR is /tmp, return data URL or /uploads/ path
    const url = `/uploads/${fileId}`;
    sendJson(res, 200, { success: true, url, filename: fileId });
  } catch (err: any) {
    sendJson(res, 500, { error: 'Failed to upload image.' });
  }
}
