// /api/ipn -- Pesapal calls this when a payment changes status.
// It only tells us WHICH order changed. We then ask Pesapal directly what the
// status is, so a forged call can't mark an order as paid.
import { json, isConfigured, loadOrder, refreshOrder } from '../_lib/pesapal.js';

async function handle(request, env) {
  const url = new URL(request.url);
  const trackingId = url.searchParams.get('OrderTrackingId') || '';
  const ref = url.searchParams.get('OrderMerchantReference') || '';
  const reply = (status) => json({
    orderNotificationType: 'IPNCHANGE',
    orderTrackingId: trackingId,
    orderMerchantReference: ref,
    status,
  });

  if (!isConfigured(env)) return reply(500);
  try {
    const order = await loadOrder(env, ref);
    if (!order || (order.trackingId && order.trackingId !== trackingId)) return reply(500);
    await refreshOrder(env, order);
    return reply(200);
  } catch (e) {
    console.error('IPN failed', e && e.message);
    return reply(500);
  }
}

export const onRequestGet = ({ request, env }) => handle(request, env);
export const onRequestPost = ({ request, env }) => handle(request, env);
