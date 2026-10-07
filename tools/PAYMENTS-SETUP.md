# Online payments (Pesapal) — setup and switch-on guide

Until you follow the steps below, the shop keeps working exactly as it does now:
customers send their order on WhatsApp. Nothing here changes the live shop until
`PESAPAL_ENABLED` is set to `true` in Cloudflare.

## What was built

| Piece | Where | What it does |
|---|---|---|
| Pay button | `shop.html` cart + `js/main.js` | "Pay with MTN, Airtel or Card" (WhatsApp stays as a second option) |
| `/api/config` | `functions/api/config.js` | Tells the shop whether online payment is switched on |
| `/api/checkout` | `functions/api/checkout.js` | Prices the order itself, saves it, asks Pesapal for a payment link |
| `/api/ipn` | `functions/api/ipn.js` | Pesapal tells us a payment changed; we confirm it with Pesapal before trusting it |
| `/api/order-status` | `functions/api/order-status.js` | Feeds the "thank you" page |
| `order-complete.html` | generated | Where the customer lands after paying |
| `orders.html` + `/api/admin/orders` | generated + `functions/api/admin/orders.js` | Staff list of orders (hidden from search engines, needs a staff key) |
| Price list | `functions/_lib/catalog.js` | Generated from `tools/shop-products.json`; the server prices every order from this |

After changing products, run `python tools/build_shop.py` — it rebuilds the shop, the product
pages and the server price list together.

## Try it on your computer first (no keys, no real money)

```
python tools/dev_server.py
```

Open http://localhost:8768/shop.html. A pretend Pesapal replaces the real one. A small badge
at the bottom left says so; the staff key for `orders.html` locally is `dev-admin`.

## Switching it on (Cloudflare)

1. **Storage for orders.** Cloudflare dashboard → Storage & databases → **KV** → create a
   namespace called `elever-orders`.
2. **Connect it to the site.** Workers & Pages → `elever-travel` → Settings → **Bindings** →
   Add → KV namespace → variable name **`ORDERS`** → pick `elever-orders`. (Do this for
   Production, and for Preview if you want to test there.)
3. **Settings and secrets.** Settings → **Variables and Secrets** → add:

   | Name | Type | Value |
   |---|---|---|
   | `PESAPAL_CONSUMER_KEY` | Secret | from Pesapal dashboard → Account Settings → Developer Settings |
   | `PESAPAL_CONSUMER_SECRET` | Secret | same page (never paste it into chat or email) |
   | `ADMIN_KEY` | Secret | a long password of your choice — it unlocks `orders.html` |
   | `PESAPAL_ENV` | Text | `sandbox` while testing, `live` for real money |
   | `PESAPAL_ENABLED` | Text | `true` to show the Pay button; anything else keeps WhatsApp-only |

4. **Test in sandbox first.** Sandbox needs Pesapal's *sandbox* keys (from
   developer.pesapal.com), not the live ones. Make a small test order and confirm that
   (a) you reach Pesapal's payment page, (b) you land back on the thank-you page, and
   (c) the order shows as COMPLETED in `orders.html`.
5. **Go live.** Once Pesapal has verified Elever and raised the transaction limit above 0:
   set the live keys, change `PESAPAL_ENV` to `live`, and place one real small order.
6. **Switch off at any time:** set `PESAPAL_ENABLED` to `false` — the shop goes back to
   WhatsApp-only straight away.

## Looking at orders

Open `https://elevertravel.com/orders.html`, type the `ADMIN_KEY`, and click an order to see
what was bought and who to contact. Pesapal's own dashboard also lists every payment.

## Safety notes

- Prices come from the server's own list, never from the customer's browser.
- An order is only marked paid after the server asks Pesapal directly and the amount matches.
- Keys live only in Cloudflare secrets, never in the website files.
- Unpaid orders are forgotten after 30 days; paid orders are kept.
- Not built yet: refunds (do these in the Pesapal dashboard), stock counts, and emailing the
  customer a receipt (Pesapal sends its own payment receipt).
