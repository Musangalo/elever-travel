// GET /api/admin/orders           -> list of orders (newest first)
// GET /api/admin/orders?ref=ELV-  -> one order in full (items, customer, payment details)
// Protected by the ADMIN_KEY secret, sent as "Authorization: Bearer <key>".
import { json, loadOrder } from '../../_lib/pesapal.js';

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ request, env }) {
  // Not set up -> behave as if the page doesn't exist.
  if (!env.ADMIN_KEY || !env.ORDERS) return json({ error: 'Not found.' }, 404);

  const given = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!safeEqual(given, env.ADMIN_KEY)) return json({ error: 'Wrong key.' }, 401);

  const ref = new URL(request.url).searchParams.get('ref');
  if (ref) {
    const order = await loadOrder(env, ref);
    return order ? json(order) : json({ error: 'Order not found.' }, 404);
  }

  const orders = [];
  let cursor;
  do {
    const page = await env.ORDERS.list({ prefix: 'order:', cursor });
    for (const k of page.keys) if (k.metadata) orders.push(k.metadata);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && orders.length < 2000);

  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return json({ orders });
}
