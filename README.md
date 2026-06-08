# Haven — Smoky Mountain STR Investment Listings Page

A self-contained, drop-in **lead-magnet page** for
[havenvacationrentals.com](https://havenvacationrentals.com).

It shows new short-term-rental investment cabins for sale in **Sevierville,
Gatlinburg, and Pigeon Forge** priced **$700K+**, syncs the listings live from
your MLS/IDX feed, and lets visitors submit interest on any property. Each
inquiry is delivered to **sales@havenvacationrentals.com** so your team can
introduce the buyer to the listing agent.

Everything lives in a single file — **`index.html`** — with no build step and no
server required.

---

## Quick start (zero setup)

Open `index.html` in a browser. It runs immediately using built-in Smoky
Mountain sample listings, with the lead form set to open the visitor's email
app pre-addressed to `sales@havenvacationrentals.com`.

Use this to review the design and copy. Then do the two setup steps below to go
fully live.

---

## Putting it on the website

Pick whichever fits how the site is managed:

- **WordPress (recommended):** Create a new page (e.g. `/str-listings`), add a
  **Custom HTML** block, and paste in the entire contents of `index.html`.
  (Or use a "full page / blank canvas" template and embed it.)
- **Drop-in file:** Upload `index.html` anywhere your host serves static files
  and link to it, or `<iframe>` it into an existing page.

The page already pulls in the Haven logo and uses the brand palette, so it
blends with the main site.

---

## Setup step 1 — Connect your live MLS/IDX feed

Open `index.html`, scroll to the **`CONFIG`** block near the bottom (clearly
marked), and set `dataSource`.

### Option A — SimplyRETS / RESO IDX (most TN IDX providers)
```js
dataSource: 'simplyrets',
simplyrets: {
  baseUrl: 'https://api.simplyrets.com/properties',
  username: 'YOUR_IDX_KEY',
  password: 'YOUR_IDX_SECRET',
  params: { type: 'residential', status: 'Active', limit: 50 }
},
```
This is the standard format used by SimplyRETS and many Great Smoky Mountains
Association of Realtors IDX resellers. The page maps the feed's fields
automatically and filters to your three cities + `$700K+`.

> **Production security note:** browser-side code can expose your API key.
> For a public launch, put your key behind the included secure proxy — see
> **[`proxy/`](proxy/README.md)** — and point `customFeedUrl` at it instead
> (Option B). The bundled `simplyrets`/`simplyrets` demo credentials are
> SimplyRETS' public sandbox and are safe to ship for testing.

### Option B — Your own JSON feed / proxy
```js
dataSource: 'custom',
customFeedUrl: 'https://your-domain.com/api/listings',
```
The page accepts either SimplyRETS-shaped records or this simplified shape:
```json
[{
  "id": "123", "mlsId": "1287445", "price": 1249000,
  "address": "3421 Black Bear Ridge Rd", "city": "Gatlinburg",
  "state": "TN", "zip": "37738",
  "beds": 5, "baths": 5.5, "sqft": 4200, "type": "Cabin",
  "listDate": "2026-06-06T00:00:00Z",
  "photo": "https://.../photo.jpg",
  "description": "…", "brokerage": "Smoky Mountain Realty"
}]
```

### Option C — Keep the demo data
Leave `dataSource: 'sample'`. Good for previews; not real inventory.

**Live sync** re-polls the feed every 5 minutes (change `syncIntervalMs`) and
shows a "Synced live · updated HH:MM" indicator. If a sync ever fails, the page
keeps showing the last good results instead of going blank.

---

## Setup step 2 — Lead delivery to sales@havenvacationrentals.com

In the same `CONFIG` block, choose how inquiries are sent (`leadMode`):

- **`'mailto'` (default, zero setup):** opens the visitor's email app with a
  fully pre-filled message to `sales@havenvacationrentals.com`. Works
  everywhere, but relies on the visitor hitting "send."
- **`'web3forms'` (recommended for a real launch — seamless, still no backend):**
  1. Go to [web3forms.com](https://web3forms.com), create a free Access Key,
     and set its destination to `sales@havenvacationrentals.com`.
  2. In `CONFIG`, paste the key and switch the mode:
     ```js
     leadMode: 'web3forms',
     web3formsKey: 'your-access-key-here',
     ```
  Submissions are then emailed instantly from inside the page (with a mailto
  fallback if the service is ever unreachable).

Every lead includes the property address, price, MLS#, listing brokerage, and
the visitor's name / email / phone / message — everything your team needs to
make the agent introduction.

---

## Filters & customization

All in the `CONFIG` block:

| Setting | Purpose |
|---|---|
| `cities` | Areas to include (default: the three target cities) |
| `minPrice` | Minimum price floor (default `700000`) |
| `syncIntervalMs` | How often to re-sync the feed |
| `leadEmail` | Lead destination address |

Brand colors are CSS variables at the top of the `<style>` block. Hero/sample
photos use Unsplash; swap them for Haven photography anytime.

---

## How it works (for visitors)

1. Browse fresh $700K+ STR-ready cabins, synced live from the MLS.
2. Submit interest on any property via a quick form.
3. Haven connects them with the listing agent and shares rental projections.
4. If they buy, Haven manages it as a Superhost property.

---

## Notes / disclaimers

- Listing data is "deemed reliable but not guaranteed"; the footer states Haven
  is not the listing brokerage and connects buyers with the listing agent
  (already included in the page).
- Confirm your IDX agreement permits public display before launching with live
  MLS data.
