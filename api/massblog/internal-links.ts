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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const env = process.env || {};
  const baseUrl = String(env.VITE_MASSBLOG_URL || env.MASSBLOG_URL || 'https://www.massblogger.com');
  const apiKeyFromQuery = Array.isArray(req.query.apiKey) ? req.query.apiKey[0] : req.query.apiKey;
  const apiKey = String(apiKeyFromQuery || env.VITE_MASSBLOG_API || env.MASSBLOG_API || '');

  if (!apiKey) {
    res.status(500).json({ error: 'Missing MASSBLOG_API / VITE_MASSBLOG_API' });
    return;
  }

  const url = new URL('/api/internal-links', baseUrl);
  url.searchParams.set('apiKey', apiKey);

  try {
    const upstream = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    const text = await upstream.text();

    if (!upstream.ok) {
      res.status(upstream.status).send(text);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(text);
  } catch (e: any) {
    res.status(502).json({ error: 'Upstream fetch failed' });
  }
}

