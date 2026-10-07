// GET /api/order-status?ref=ELV-... -- used by the "thank you" page after the customer
// returns from Pesapal. Re-checks with Pesapal while the order is still pending, and
// only returns what the customer already knows (no email or phone).
import { json, isConfigured, loadOrder, refreshOrder } from '../_lib/pesapal.js';

export async function onRequestGet({ request, env }) {
  if (!isConfigured(env)) return json({ error: 'Not available.' }, 503);
  const ref = new URL(request.url).searchParams.get('ref');
  try {
    let order = await loadOrder(env, ref);
    if (!order) return json({ error: 'Order not found.' }, 404);
    if (order.status === 'PENDING') order = await refreshOrder(env, order);
    return json({
      ref: order.ref,
      status: order.status,
      total: order.total,
      items: order.items.map((i) => ({ name: i.name, variant: i.variant, qty: i.qty })),
    });
  } catch (e) {
    console.error('Order status failed', e && e.message);
    return json({ error: 'Could not check the order right now.' }, 502);
  }
}
