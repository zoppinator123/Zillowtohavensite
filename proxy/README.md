# Secure MLS/IDX Proxy

This little proxy keeps your **paid MLS/IDX API credentials out of the public
page**. The listings page calls the proxy; the proxy adds your secret key
server-side and forwards the request to your IDX vendor. Your key is never
visible in the page source.

`listings-proxy.js` is a **Cloudflare Worker** — free, no credit card, and it
works no matter where `index.html` is hosted (WordPress, etc.).

> The proxy is the same whether your data comes from an MLS/IDX vendor or from a
> RapidAPI Zillow provider — it just holds the secret key and forwards requests.
> **Fastest launch → jump to ["Zillow via RapidAPI"](#fast-path--zillow-via-rapidapi) below.**
> **Cleanest long-term → the MLS/IDX steps that follow.**

---

## Fast path — Zillow via RapidAPI

Go live in an afternoon with no broker and no MLS approval. You pay a third-party
provider (~$30–75/mo) that scrapes Zillow for you and returns JSON; the proxy
keeps your key secret.

> ⚠️ **Know the trade-off:** you'll be republishing Zillow-origin data on a public
> commercial page, which carries Zillow ToS / photo-copyright risk. The page
> de-risks by linking out to each original Zillow listing rather than claiming
> it. Treat this as a **bridge** while you set up a clean MLS/Bridge feed.

1. Create a [RapidAPI](https://rapidapi.com) account and subscribe to a Zillow
   data API. The page is built for the common **"Zillow.com API" (`zillow-com1`)**
   provider and its `/propertyExtendedSearch` endpoint. Copy your **RapidAPI key**.
2. Deploy the worker (Step 1 below), then set these variables (Step 2):

   | Variable | Value |
   |---|---|
   | `UPSTREAM_URL` | `https://zillow-com1.p.rapidapi.com/propertyExtendedSearch` |
   | `ALLOWED_ORIGIN` | `https://havenvacationrentals.com` |
   | `AUTH_MODE` | `header` |
   | `AUTH_HEADER_NAME` | `X-RapidAPI-Key` |
   | `AUTH_TOKEN` | *(your RapidAPI key — Encrypt)* |
   | `EXTRA_HEADERS` | `{"X-RapidAPI-Host":"zillow-com1.p.rapidapi.com"}` |

3. In `index.html` → `CONFIG`:
   ```js
   dataSource: 'zillow',
   zillow: { proxyUrl: 'https://haven-listings.yourname.workers.dev', homeType: 'Houses', statusType: 'ForSale' },
   ```
   The page calls the proxy once per city (Sevierville / Gatlinburg / Pigeon
   Forge), filters to `$700K+`, de-dupes, and renders. Done.

> Using a *different* RapidAPI Zillow provider? Their JSON field names may differ
> from `zillow-com1`'s `props[]` shape — send me a sample response and I'll adjust
> the `normalizeZillow()` mapping in `index.html`.

---

## Step 0 — Get MLS data access first  *(cleaner long-term route)*

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

## Prefer Vercel instead of Cloudflare?

Already included: **[`/api/listings.js`](../api/listings.js)** is the same proxy
as a Vercel serverless function.

1. Import this repo at <https://vercel.com> (Add New → Project). Vercel
   auto-detects `/api/listings.js` — no build settings needed.
2. Project → **Settings → Environment Variables**: add the **same variables**
   listed in the table above (`UPSTREAM_URL`, `ALLOWED_ORIGIN`, `AUTH_MODE`,
   `AUTH_TOKEN`, etc.), then **Redeploy**.
3. Your endpoint is `https://<your-project>.vercel.app/api/listings`.
4. In `index.html` set:
   ```js
   dataSource: 'custom',
   customFeedUrl: 'https://<your-project>.vercel.app/api/listings',
   ```

Use **either** the Cloudflare Worker **or** the Vercel function — not both.
Netlify works the same way (functions read the identical `process.env` names).
