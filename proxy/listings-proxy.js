/**
 * Haven STR Listings — Secure MLS/IDX Proxy (Cloudflare Worker)
 * ============================================================
 * Purpose: keep your paid MLS/IDX API credentials OFF the public page.
 *
 * The static listings page (index.html) calls THIS worker instead of the
 * MLS vendor directly. The worker injects your secret credentials
 * server-side, forwards the request to your IDX vendor, and returns the
 * JSON to the page — with CORS locked to your domain.
 *
 * Your key is stored as an encrypted Cloudflare "secret" and is never
 * visible in the browser / page source.
 *
 * ---------------------------------------------------------------------
 * SETUP (free, no credit card):
 *   1. Create a free account at https://workers.cloudflare.com
 *   2. Create a Worker, paste in this file, and Deploy.
 *   3. In the Worker's Settings → Variables, add these
 *      (mark the credential ones as "Encrypt"/Secret):
 *
 *        UPSTREAM_URL     e.g. https://api.idxbroker.com/clients/featured
 *                         (or your vendor's listings endpoint)
 *        ALLOWED_ORIGIN   https://havenvacationrentals.com
 *        AUTH_MODE        one of: basic | bearer | header | query
 *
 *        -- depending on AUTH_MODE, also add: --
 *        AUTH_USERNAME    (basic)  your vendor username/key
 *        AUTH_PASSWORD    (basic)  your vendor password/secret
 *        AUTH_TOKEN       (bearer/header/query) your API key/token
 *        AUTH_HEADER_NAME (header) e.g. accesskey   (IDX Broker uses this)
 *        AUTH_QUERY_NAME  (query)  e.g. apikey
 *
 *        -- optional: extra fixed query params sent upstream, as JSON --
 *        FIXED_PARAMS     e.g. {"status":"Active","limit":"50"}
 *
 *   4. Copy your Worker URL (e.g. https://haven-listings.<you>.workers.dev)
 *   5. In index.html CONFIG set:
 *        dataSource: 'custom',
 *        customFeedUrl: 'https://haven-listings.<you>.workers.dev',
 *
 * Filtering by city / price / beds still happens in the page, so even a
 * broad feed gets narrowed to Sevierville / Gatlinburg / Pigeon Forge,
 * $700K+. (You can also pre-filter upstream via FIXED_PARAMS.)
 * ---------------------------------------------------------------------
 */

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://havenvacationrentals.com';
    const cors = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=60',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }
    if (!env.UPSTREAM_URL) {
      return json({ error: 'UPSTREAM_URL not configured' }, 500, cors);
    }

    // Build upstream URL: vendor endpoint + params from the page + fixed params.
    const upstream = new URL(env.UPSTREAM_URL);
    const incoming = new URL(request.url).searchParams;
    for (const [k, v] of incoming) upstream.searchParams.append(k, v);

    if (env.FIXED_PARAMS) {
      try {
        const fixed = JSON.parse(env.FIXED_PARAMS);
        for (const [k, v] of Object.entries(fixed)) {
          if (Array.isArray(v)) v.forEach(item => upstream.searchParams.append(k, item));
          else upstream.searchParams.set(k, v);
        }
      } catch (_) { /* ignore malformed FIXED_PARAMS */ }
    }

    // Apply credentials server-side based on AUTH_MODE.
    const headers = { 'Accept': 'application/json' };
    const mode = (env.AUTH_MODE || 'basic').toLowerCase();
    if (mode === 'basic') {
      headers['Authorization'] = 'Basic ' + btoa(`${env.AUTH_USERNAME || ''}:${env.AUTH_PASSWORD || ''}`);
    } else if (mode === 'bearer') {
      headers['Authorization'] = 'Bearer ' + (env.AUTH_TOKEN || '');
    } else if (mode === 'header') {
      headers[env.AUTH_HEADER_NAME || 'accesskey'] = env.AUTH_TOKEN || '';
    } else if (mode === 'query') {
      upstream.searchParams.set(env.AUTH_QUERY_NAME || 'apikey', env.AUTH_TOKEN || '');
    }

    try {
      const res = await fetch(upstream.toString(), { headers });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          ...cors,
          'Content-Type': res.headers.get('Content-Type') || 'application/json',
        },
      });
    } catch (err) {
      return json({ error: 'Upstream fetch failed', detail: String(err) }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
