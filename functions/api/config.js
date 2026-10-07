// GET /api/config -- tells the shop whether to offer online payment.
// Online checkout is only offered when it has been switched on AND fully set up;
// otherwise the shop keeps using WhatsApp orders.
import { json, isConfigured } from '../_lib/pesapal.js';

export function onRequestGet({ env }) {
  return json({ onlinePayments: env.PESAPAL_ENABLED === 'true' && isConfigured(env) });
}
