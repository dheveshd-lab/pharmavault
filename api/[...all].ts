import { sendJson, setCORS } from './_lib/db';

export default function handler(req: any, res: any): void {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  sendJson(res, 404, {
    success: false,
    error: `API endpoint not found: ${req.url || ''}`,
    message: 'The requested API endpoint was not found on this server.',
  });
}
