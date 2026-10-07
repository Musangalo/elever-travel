// Pesapal API 3.0 helpers, shared by the /api/* functions.
//
// Secrets (set in Cloudflare, never in the repo):
//   PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, ADMIN_KEY
// Plain settings:
//   PESAPAL_ENV      "live" for real payments; anything else uses Pesapal's sandbox
//   PESAPAL_ENABLED  "true" turns online checkout on for customers
//   PESAPAL_BASE     optional override of the API base URL (local testing only)
// KV binding:
//   ORDERS           stores every order

const SANDBOX = 'https://cybqa.pesapal.com/pesapalv3';
const LIVE = 'https://pay.pesapal.com/v3';

export function apiBase(env) {
  if (env.PESAPAL_BASE) return env.PESAPAL_BASE.replace(/\/+$/, '');
  return env.PESAPAL_ENV === 'live' ? LIVE : SANDBOX;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function isConfigured(env) {
  return Boolean(env.PESAPAL_CONSUMER_KEY && env.PESAPAL_CONSUMER_SECRET && env.ORDERS);
}

async function call(env, path, { method = 'GET', token, body } = {}) {
  const res = await fetch(apiBase(env) + path, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON error page */ }
  if (!res.ok || (data && data.error)) {
    console.error('Pesapal error', path, res.status, JSON.stringify(data && data.error));
    throw new Error('Pesapal request failed: ' + path);
  }
  return data;
}

// Tokens only last 5 minutes, so ask for a fresh one per request.
export async function getToken(env) {
  const data = await call(env, '/api/Auth/RequestToken', {
    method: 'POST',
    body: { consumer_key: env.PESAPAL_CONSUMER_KEY, consumer_secret: env.PESAPAL_CONSUMER_SECRET },
  });
  if (!data || !data.token) throw new Error('Pesapal gave no token');
  return data.token;
}

// Pesapal needs an "IPN id" for the URL it will notify when a payment changes.
// Register it once per environment and remember it in KV.
export async function getIpnId(env, token, ipnUrl) {
  const key = 'ipn:' + apiBase(env) + ':' + ipnUrl;
  const cached = await env.ORDERS.get(key);
  if (cached) return cached;
  const data = await call(env, '/api/URLSetup/RegisterIPN', {
    method: 'POST',
    token,
    body: { url: ipnUrl, ipn_notification_type: 'GET' },
  });
  if (!data || !data.ipn_id) throw new Error('Pesapal gave no IPN id');
  await env.ORDERS.put(key, data.ipn_id);
  return data.ipn_id;
}

export function submitOrder(env, token, order) {
  return call(env, '/api/Transactions/SubmitOrderRequest', { method: 'POST', token, body: order });
}

export function getTransactionStatus(env, token, trackingId) {
  return call(env, '/api/Transactions/GetTransactionStatus?orderTrackingId=' + encodeURIComponent(trackingId), { token });
}

// ---- orders in KV -------------------------------------------------------

const DAY = 86400;

export function orderKey(ref) { return 'order:' + ref; }

// Small summary stored as KV metadata so the admin list needs one read, not one per order.
function summary(order) {
  return {
    ref: order.ref,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    name: order.customer.name.slice(0, 40),
    phone: order.customer.phone.slice(0, 20),
    count: order.items.reduce((n, i) => n + i.qty, 0),
  };
}

export async function saveOrder(env, order) {
  // Unpaid orders expire after 30 days; paid ones are kept.
  const opts = { metadata: summary(order) };
  if (order.status !== 'COMPLETED') opts.expirationTtl = 30 * DAY;
  await env.ORDERS.put(orderKey(order.ref), JSON.stringify(order), opts);
}

export async function loadOrder(env, ref) {
  if (!/^[A-Za-z0-9_.:-]{1,50}$/.test(ref || '')) return null;
  const raw = await env.ORDERS.get(orderKey(ref));
  return raw ? JSON.parse(raw) : null;
}

// Ask Pesapal for the real status (never trust what a browser or an IPN call claims)
// and update the stored order. Safe to call repeatedly.
export async function refreshOrder(env, order) {
  if (!order || !order.trackingId) return order;
  const token = await getToken(env);
  const tx = await getTransactionStatus(env, token, order.trackingId);
  const description = String(tx.payment_status_description || '').toUpperCase();
  let status = order.status;
  if (description === 'COMPLETED') {
    // The amount and currency must match what we asked for.
    const paidOk = Number(tx.amount) === order.total && String(tx.currency || 'UGX').toUpperCase() === 'UGX';
    status = paidOk ? 'COMPLETED' : 'AMOUNT_MISMATCH';
  } else if (description === 'FAILED' || description === 'REVERSED') {
    status = description;
  }
  if (status !== order.status) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (tx.payment_method) order.paymentMethod = tx.payment_method;
    if (tx.confirmation_code) order.confirmationCode = tx.confirmation_code;
    await saveOrder(env, order);
  }
  return order;
}
