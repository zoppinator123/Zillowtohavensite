# Secure MLS/IDX Proxy

This little proxy keeps your **paid MLS/IDX API credentials out of the public
page**. The listings page calls the proxy; the proxy adds your secret key
server-side and forwards the request to your IDX vendor. Your key is never
visible in the page source.

`listings-proxy.js` is a **Cloudflare Worker** — free, no credit card, and it
works no matter where `index.html` is hosted (WordPress, etc.).

---

## Step 0 — Get MLS data access first

Our local MLS is **Great Smoky Mountains MLS (GSMMLS / GSMAR)**. To show its
listings you need a paid **IDX data license**, sponsored by a licensed
agent/broker. The vendor helps you get it.

For this custom page you need a vendor that exposes a **JSON API** (not just a
drop-in search widget). Best fit among GSMMLS-approved vendors:

- **IDX Broker** — GSMMLS-approved and has a developer JSON API. Recommended.
- **Bridge Interactive (Zillow Group)** — free RESO JSON feeds *if* GSMMLS is
  on the Bridge platform; ask them.

Once you have a vendor + credentials, come back and finish the steps below.
(Tell your developer/Claude which vendor you chose — the exact JSON field names
differ per vendor and the page needs a small mapping added for non-SimplyRETS
feeds.)

---

## Step 1 — Deploy the worker

1. Create a free account at <https://workers.cloudflare.com>.
2. **Create Worker** → paste the entire contents of `listings-proxy.js` → **Deploy**.
3. Copy the Worker URL, e.g. `https://haven-listings.yourname.workers.dev`.

## Step 2 — Add your credentials as secrets

In the Worker → **Settings → Variables and Secrets**, add (mark the credential
ones **Encrypt**):

| Variable | Example | Notes |
|---|---|---|
| `UPSTREAM_URL` | `https://api.idxbroker.com/clients/featured` | Your vendor's listings endpoint |
| `ALLOWED_ORIGIN` | `https://havenvacationrentals.com` | Locks the proxy to your site |
| `AUTH_MODE` | `header` | `basic` \| `bearer` \| `header` \| `query` |
| `AUTH_TOKEN` | *(your key)* | for bearer/header/query modes |
| `AUTH_HEADER_NAME` | `accesskey` | for `header` mode (IDX Broker uses `accesskey`) |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | *(your creds)* | for `basic` mode |
| `FIXED_PARAMS` *(optional)* | `{"status":"Active","limit":"50"}` | extra query params sent upstream |

> Not sure which `AUTH_MODE`? Check your vendor's API docs for how they
> authenticate — almost every vendor maps to one of these four. IDX Broker =
> `header` with `AUTH_HEADER_NAME=accesskey`.

## Step 3 — Point the page at the proxy

In `index.html` → `CONFIG`:

```js
dataSource: 'custom',
customFeedUrl: 'https://haven-listings.yourname.workers.dev',
```

Save and re-upload. The page now pulls live listings through the proxy, and the
key stays secret. City/price/bedroom filters still apply on the page, so results
are narrowed to Sevierville / Gatlinburg / Pigeon Forge, $700K+.

---

## Prefer Vercel/Netlify instead of Cloudflare?

The same logic works as a serverless function (`/api/listings`). The auth
handling is identical — just read the same variable names from
`process.env`. Ask and I'll generate that version.
