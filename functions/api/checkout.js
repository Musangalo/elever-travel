// POST /api/checkout -- start an online payment.
//
// The browser sends only WHAT was ordered (item id, choices, quantity) and who is
// paying. Prices are looked up here from the catalogue, so a customer can't change
// what they pay by editing the page.
import catalog from '../_lib/catalog.js';
import { json, isConfigured, getToken, getIpnId, submitOrder, saveOrder } from '../_lib/pesapal.js';

const MAX_LINES = 40;
const MAX_QTY = 99;

// Work out the price of one cart line from the catalogue. Returns null if it isn't valid.
function priceLine(line) {
  const product = catalog[line && line.id];
  const qty = Number(line && line.qty);
  if (!product || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;

  const chosen = line.variant ? String(line.variant).split(' / ') : [];
  if (chosen.length !== product.variants.length) return null;

  let unit = product.price;
  for (let i = 0; i < chosen.length; i++) {
    const option = product.variants[i].find((o) => o.value === chosen[i]);
    if (!option) return null;
    if (option.price) unit = option.price;
  }
  return {
    id: line.id,
    name: product.name,
    variant: chosen.length ? chosen.join(' / ') : null,
    qty,
    unitPrice: unit,
  };
}

function clean(text, max) {
  return String(text || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
}

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env) || env.PESAPAL_ENABLED !== 'true') {
    return json({ error: 'Online payment is not available right now.' }, 503);
  }

  let body;
  try {
    if (Number(request.headers.get('content-length') || 0) > 20000) throw new Error('too large');
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid request.' }, 400);
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : [];
  const items = rawItems.map(priceLine);
  if (items.length === 0 || items.some((i) => i === null)) {
    return json({ error: 'Some items in your cart are no longer valid. Please refresh the page and try again.' }, 400);
  }

  const name = clean(body.customer && body.customer.name, 80);
  const email = clean(body.customer && body.customer.email, 120);
  const phone = clean(body.customer && body.customer.phone, 20);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
    return json({ error: 'Please check your name, email address and phone number.' }, 400);
  }

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const ref = 'ELV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const origin = new URL(request.url).origin;

  const order = {
    ref,
    status: 'PENDING',
    total,
    currency: 'UGX',
    items,
    customer: { name, email, phone },
    createdAt: new Date().toISOString(),
  };

  try {
    const token = await getToken(env);
    const notificationId = await getIpnId(env, token, origin + '/api/ipn');
    const [firstName, ...rest] = name.split(/\s+/);
    const description = ('Elever Shop ' + ref + ': ' + items.map((i) => i.qty + 'x ' + i.name).join(', ')).slice(0, 100);

    const result = await submitOrder(env, token, {
      id: ref,
      currency: 'UGX',
      amount: total,
      description,
      callback_url: origin + '/order-complete.html',
      cancellation_url: origin + '/shop.html#shopCart',
      notification_id: notificationId,
      billing_address: {
        email_address: email,
        phone_number: phone,
        country_code: 'UG',
        first_name: firstName,
        last_name: rest.join(' '),
      },
    });
    if (!result || !result.redirect_url || !result.order_tracking_id) throw new Error('No payment link returned');

    order.trackingId = result.order_tracking_id;
    await saveOrder(env, order);
    return json({ redirectUrl: result.redirect_url, orderRef: ref });
  } catch (e) {
    console.error('Checkout failed', e && e.message);
    return json({ error: 'We could not start the payment. Please try again, or order on WhatsApp.' }, 502);
  }
}
