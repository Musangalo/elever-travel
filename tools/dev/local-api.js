// LOCAL TESTING ONLY -- injected by tools/dev_server.py, never part of the live site.
//
// Runs the real code in functions/ inside the browser and stands in for Pesapal, so the
// checkout can be tried end to end without keys or real money.
//   * /api/* calls are answered by the real functions (functions/api/*.js)
//   * Pesapal itself is replaced by a pretend one (see mockPesapal below)
//   * "KV" storage is kept in this browser's localStorage
(function () {
  if (window.__localApi) return;
  window.__localApi = true;

  var MOCK = 'https://mock-pesapal.invalid';
  var realFetch = window.fetch.bind(window);
  var KV_PREFIX = 'devkv:';
  var TX_PREFIX = 'devpesapal:';

  // ---- pretend Cloudflare KV ------------------------------------------------
  var ORDERS = {
    get: function (key) {
      var raw = localStorage.getItem(KV_PREFIX + key);
      return Promise.resolve(raw ? JSON.parse(raw).value : null);
    },
    put: function (key, value, opts) {
      localStorage.setItem(KV_PREFIX + key, JSON.stringify({ value: value, metadata: (opts && opts.metadata) || null }));
      return Promise.resolve();
    },
    list: function (opts) {
      var prefix = (opts && opts.prefix) || '';
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(KV_PREFIX + prefix) === 0) {
          keys.push({ name: k.slice(KV_PREFIX.length), metadata: JSON.parse(localStorage.getItem(k)).metadata });
        }
      }
      return Promise.resolve({ keys: keys, list_complete: true });
    }
  };

  function online() { return localStorage.getItem('devOnline') !== '0'; }

  function env() {
    return {
      PESAPAL_ENABLED: online() ? 'true' : 'false',
      PESAPAL_CONSUMER_KEY: 'dev-key',
      PESAPAL_CONSUMER_SECRET: 'dev-secret',
      PESAPAL_BASE: MOCK,
      ADMIN_KEY: 'dev-admin',
      ORDERS: ORDERS
    };
  }

  function reply(body, status) {
    return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ---- pretend Pesapal --------------------------------------------------------
  function readTx(id) { var raw = localStorage.getItem(TX_PREFIX + id); return raw ? JSON.parse(raw) : null; }
  function writeTx(id, tx) { localStorage.setItem(TX_PREFIX + id, JSON.stringify(tx)); }
  window.__devPesapal = { read: readTx, write: writeTx };

  async function mockPesapal(url, init) {
    var path = url.pathname;
    var method = ((init && init.method) || 'GET').toUpperCase();
    var headers = new Headers((init && init.headers) || {});
    var body = init && init.body ? JSON.parse(init.body) : null;

    if (path.endsWith('/api/Auth/RequestToken')) {
      if (!body || body.consumer_key !== 'dev-key' || body.consumer_secret !== 'dev-secret') {
        return reply({ error: { code: 'invalid_consumer_key_or_secret_provided' }, status: '500' }, 500);
      }
      return reply({ token: 'dev-token', expiryDate: new Date(Date.now() + 300000).toISOString(), error: null, status: '200' });
    }
    if (headers.get('Authorization') !== 'Bearer dev-token') {
      return reply({ error: { code: 'unauthorized' }, status: '401' }, 401);
    }
    if (path.endsWith('/api/URLSetup/RegisterIPN')) {
      return reply({ url: body.url, ipn_id: 'dev-ipn-id', ipn_status_description: 'Active', error: null, status: '200' });
    }
    if (path.endsWith('/api/Transactions/SubmitOrderRequest')) {
      var missing = ['id', 'currency', 'amount', 'description', 'callback_url', 'notification_id', 'billing_address']
        .filter(function (f) { return body[f] === undefined || body[f] === ''; });
      if (missing.length || String(body.description).length > 100 || !/^[A-Za-z0-9_.:-]{1,50}$/.test(body.id)) {
        return reply({ error: { code: 'invalid_order_request', message: 'bad fields: ' + missing.join(',') }, status: '400' }, 400);
      }
      var tracking = 'dev-' + Math.random().toString(36).slice(2, 12);
      writeTx(tracking, { order: body, status: 'INVALID', code: 0 });
      return reply({
        order_tracking_id: tracking,
        merchant_reference: body.id,
        redirect_url: location.origin + '/tools/dev/mock-pay.html?id=' + tracking,
        error: null,
        status: '200'
      });
    }
    if (path.endsWith('/api/Transactions/GetTransactionStatus') && method === 'GET') {
      var tx = readTx(url.searchParams.get('orderTrackingId'));
      if (!tx) return reply({ error: { code: 'not_found' }, status: '404' }, 404);
      return reply({
        payment_status_description: tx.status,
        status_code: tx.code,
        amount: tx.order.amount,
        currency: tx.order.currency,
        payment_method: tx.status === 'COMPLETED' ? 'MtnUganda' : '',
        confirmation_code: tx.status === 'COMPLETED' ? 'DEV-' + tx.order.id.slice(-5) : '',
        merchant_reference: tx.order.id,
        error: null,
        status: '200'
      });
    }
    return reply({ error: { code: 'unknown_mock_endpoint', message: path }, status: '404' }, 404);
  }

  // ---- route /api/* into the real functions -----------------------------------
  var FILES = {
    '/api/config': '/functions/api/config.js',
    '/api/checkout': '/functions/api/checkout.js',
    '/api/ipn': '/functions/api/ipn.js',
    '/api/order-status': '/functions/api/order-status.js',
    '/api/admin/orders': '/functions/api/admin/orders.js'
  };

  async function runFunction(url, init) {
    var file = FILES[url.pathname];
    if (!file) return reply({ error: 'Not found' }, 404);
    var mod = await import(file + '?v=' + Date.now());
    var method = ((init && init.method) || 'GET').toUpperCase();
    var handler = mod['onRequest' + method.charAt(0) + method.slice(1).toLowerCase()] || mod.onRequest;
    if (!handler) return reply({ error: 'Method not allowed' }, 405);
    return handler({ request: new Request(url.href, init), env: env() });
  }

  window.fetch = function (input, init) {
    var raw = typeof input === 'string' ? input : input.url;
    var url = new URL(raw, location.href);
    if (url.origin === location.origin && url.pathname.indexOf('/api/') === 0) return runFunction(url, init);
    if (url.href.indexOf(MOCK) === 0) return mockPesapal(url, init);
    return realFetch(input, init);
  };

  // ---- small badge so nobody mistakes this for the real site ---------------------
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99999;background:#222;color:#fff;font:12px/1.4 sans-serif;padding:6px 10px;border-top-right-radius:6px;opacity:.92';
    bar.innerHTML = 'LOCAL TEST — payments are simulated. Online payments: <b>' + (online() ? 'ON' : 'OFF') +
      '</b> · <a href="#" style="color:#F5B942" id="devToggle">turn ' + (online() ? 'off' : 'on') + '</a>' +
      ' · staff key for orders.html: <b>dev-admin</b>';
    document.body.appendChild(bar);
    document.getElementById('devToggle').addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.setItem('devOnline', online() ? '0' : '1');
      location.reload();
    });
  });
})();
