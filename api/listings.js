/**
 * Haven STR Listings — Secure MLS/IDX Proxy (Vercel Serverless Function)
 * ======================================================================
 * Vercel/Netlify equivalent of proxy/listings-proxy.js.
 *
 * Keeps your paid MLS/IDX API credentials OFF the public page. The static
 * listings page calls THIS endpoint; it injects your secret credentials
 * server-side, forwards to your IDX vendor, and returns JSON with CORS
 * locked to your domain. Your key lives in Vercel env vars, never in the
 * browser / page source.
 *
 * ---------------------------------------------------------------------
 * DEPLOY:
 *   1. Import this repo at https://vercel.com (Add New → Project).
 *      Vercel auto-detects /api/listings.js as a serverless function;
 *      no build settings needed.
 *   2. Project → Settings → Environment Variables, add (Production):
 *
 *        UPSTREAM_URL     e.g. https://api.idxbroker.com/clients/featured
 *        ALLOWED_ORIGIN   https://havenvacationrentals.com
 *        AUTH_MODE        one of: basic | bearer | header | query
 *
 *        -- depending on AUTH_MODE, also add: --
 *        AUTH_USERNAME    (basic)  your vendor username/key
 *        AUTH_PASSWORD    (basic)  your vendor password/secret
 *        AUTH_TOKEN       (bearer/header/query) your API key/token
 *        AUTH_HEADER_NAME (header) e.g. accesskey   (IDX Broker uses this)
 *        AUTH_QUERY_NAME  (query)  e.g. apikey
 *        FIXED_PARAMS     (optional) JSON, e.g. {"status":"Active","limit":"50"}
 *
 *   3. Redeploy. Your endpoint is:
 *        https://<your-project>.vercel.app/api/listings
 *   4. In index.html CONFIG set:
 *        dataSource: 'custom',
 *        customFeedUrl: 'https://<your-project>.vercel.app/api/listings',
 * ---------------------------------------------------------------------
 */

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://havenvacationrentals.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.UPSTREAM_URL) return res.status(500).json({ error: 'UPSTREAM_URL not configured' });

  // Build upstream URL: vendor endpoint + params from the page + fixed params.
  const upstream = new URL(process.env.UPSTREAM_URL);
  const incoming = new URL(req.url, 'http://x').searchParams;
  for (const [k, v] of incoming) upstream.searchParams.append(k, v);

  if (process.env.FIXED_PARAMS) {
    try {
      const fixed = JSON.parse(process.env.FIXED_PARAMS);
      for (const [k, v] of Object.entries(fixed)) {
        if (Array.isArray(v)) v.forEach(item => upstream.searchParams.append(k, item));
        else upstream.searchParams.set(k, v);
      }
    } catch (_) { /* ignore malformed FIXED_PARAMS */ }
  }

  // Apply credentials server-side based on AUTH_MODE.
  const headers = { Accept: 'application/json' };
  const mode = (process.env.AUTH_MODE || 'basic').toLowerCase();
  if (mode === 'basic') {
    const creds = `${process.env.AUTH_USERNAME || ''}:${process.env.AUTH_PASSWORD || ''}`;
    headers.Authorization = 'Basic ' + Buffer.from(creds).toString('base64');
  } else if (mode === 'bearer') {
    headers.Authorization = 'Bearer ' + (process.env.AUTH_TOKEN || '');
  } else if (mode === 'header') {
    headers[process.env.AUTH_HEADER_NAME || 'accesskey'] = process.env.AUTH_TOKEN || '';
  } else if (mode === 'query') {
    upstream.searchParams.set(process.env.AUTH_QUERY_NAME || 'apikey', process.env.AUTH_TOKEN || '');
  }

  // Optional extra static headers (e.g. RapidAPI needs X-RapidAPI-Host too).
  // EXTRA_HEADERS is JSON, e.g. {"X-RapidAPI-Host":"zillow-com1.p.rapidapi.com"}
  if (process.env.EXTRA_HEADERS) {
    try { Object.assign(headers, JSON.parse(process.env.EXTRA_HEADERS)); } catch (_) {}
  }

  try {
    const upstreamRes = await fetch(upstream.toString(), { headers });
    const body = await upstreamRes.text();
    res.setHeader('Content-Type', upstreamRes.headers.get('Content-Type') || 'application/json');
    return res.status(upstreamRes.status).send(body);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream fetch failed', detail: String(err) });
  }
}
