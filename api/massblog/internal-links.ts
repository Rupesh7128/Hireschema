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
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const env = process.env || {};
  const baseUrl = String(env.MASSBLOG_URL || env.VITE_MASSBLOG_URL || 'https://www.massblogger.com');
  const apiKey = String(env.MASSBLOG_API || env.VITE_MASSBLOG_API || '');

  if (!apiKey) {
    res.status(500).json({ error: 'Missing MASSBLOG_API' });
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
