import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
}

interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
}

const normalizeCode = (value: string) => String(value || '').trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, redeemed: false, reason: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const code = normalizeCode(body?.code || '');
    if (!code) {
      res.status(400).json({ ok: false, redeemed: false, reason: 'Missing promo code' });
      return;
    }

    const env = process.env || {};
    const enabled = String(env.PROMO_BYPASS_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      res.status(200).json({ ok: true, redeemed: false, reason: 'Promo codes are currently disabled.' });
      return;
    }

    const rawCodes = String(env.PROMO_CODES || env.PROMO_CODE || '').trim();
    if (!rawCodes) {
      res.status(200).json({ ok: true, redeemed: false, reason: 'Promo codes are not configured.' });
      return;
    }

    const allowed = rawCodes
      .split(',')
      .map(s => normalizeCode(s))
      .filter(Boolean);

    const isAllowed = allowed.includes(code);
    if (!isAllowed) {
      res.status(200).json({ ok: true, redeemed: false, reason: 'Invalid promo code.' });
      return;
    }

    res.status(200).json({ ok: true, redeemed: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, redeemed: false, reason: 'Server error' });
  }
}

