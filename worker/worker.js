const PRICE_ID = "pri_01m1s10f51v9c9dd5mnhmvz0w1";
const encoder = new TextEncoder();

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "https://johnwish1590.github.io",
      "access-control-allow-headers": "content-type",
    },
  });
}

function base64url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalStrings(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(value));
}

async function verifyPaddleSignature(secret, header, rawBody) {
  if (!secret || !header) return false;
  const fields = new Map();
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!fields.has(name)) fields.set(name, []);
    fields.get(name).push(value);
  }
  const timestamp = fields.get("ts")?.[0];
  const signatures = fields.get("h1") || [];
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = hex(await hmac(secret, `${timestamp}:${rawBody}`));
  return signatures.some((candidate) => equalStrings(expected, candidate));
}

async function makeLicenseKey(transactionId, secret) {
  const digest = await hmac(secret, `license:${transactionId}`);
  return `SNIPNOW-${base64url(digest).slice(0, 24).toUpperCase()}`;
}

async function makeActivationId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `act_${base64url(bytes)}`;
}

function normalizedEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasSnipNowPrice(data) {
  return Array.isArray(data?.items) && data.items.some((item) => item?.price?.id === PRICE_ID);
}

async function paddleTransaction(transactionId, apiKey) {
  const response = await fetch(`https://api.paddle.com/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload.data || null;
}

async function paddleCustomer(customerId, apiKey) {
  if (!customerId) return null;
  const response = await fetch(`https://api.paddle.com/customers/${encodeURIComponent(customerId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload.data || null;
}

async function saveOrder(env, { transactionId, eventId, email, status, licenseHash }) {
  const existing = await env.DB.prepare(
    "SELECT transaction_id FROM orders WHERE transaction_id = ?1",
  ).bind(transactionId).first();
  if (existing) return false;
  await env.DB.prepare(
    `INSERT INTO orders (transaction_id, event_id, email, status, license_hash, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  ).bind(transactionId, eventId, email || null, status, licenseHash, new Date().toISOString()).run();
  return true;
}

async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paddle-Signature");
  if (!(await verifyPaddleSignature(env.PADDLE_WEBHOOK_SECRET, signature, rawBody))) {
    return json({ error: "invalid webhook signature" }, 401);
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (event.event_type !== "transaction.completed") return json({ received: true, ignored: true });
  const transactionId = event.data?.id;
  if (!transactionId || !hasSnipNowPrice(event.data)) return json({ received: true, ignored: true });
  const licenseKey = await makeLicenseKey(transactionId, env.LICENSE_HASH_SECRET);
  const licenseHash = hex(await hmac(env.LICENSE_HASH_SECRET, `hash:${licenseKey}`));
  const inserted = await saveOrder(env, {
    transactionId,
    eventId: event.event_id || `event_${transactionId}`,
    email: normalizedEmail(event.data?.customer_email),
    status: "completed",
    licenseHash,
  });
  return json({ received: true, issued: inserted });
}

async function handleClaim(request, env) {
  if (!env.PADDLE_API_KEY) return json({ error: "PADDLE_API_KEY is not configured" }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() : "";
  const email = normalizedEmail(body.email);
  if (!transactionId || !email) return json({ error: "transaction_id and email are required" }, 400);
  const transaction = await paddleTransaction(transactionId, env.PADDLE_API_KEY);
  if (!transaction || transaction.status !== "completed" || !hasSnipNowPrice(transaction)) {
    return json({ error: "completed SnipNow transaction not found" }, 404);
  }
  let customerEmail = normalizedEmail(transaction.customer_email);
  if (!customerEmail) {
    const customer = await paddleCustomer(transaction.customer_id, env.PADDLE_API_KEY);
    customerEmail = normalizedEmail(customer?.email);
  }
  if (!customerEmail || customerEmail !== email) return json({ error: "email does not match the transaction" }, 403);

  const licenseKey = await makeLicenseKey(transactionId, env.LICENSE_HASH_SECRET);
  const licenseHash = hex(await hmac(env.LICENSE_HASH_SECRET, `hash:${licenseKey}`));
  await saveOrder(env, {
    transactionId,
    eventId: `claim_${transactionId}`,
    email,
    status: "completed",
    licenseHash,
  });
  await env.DB.prepare("UPDATE orders SET claimed_at = ?1, email = ?2 WHERE transaction_id = ?3")
    .bind(new Date().toISOString(), email, transactionId).run();
  return json({ license_key: licenseKey, transaction_id: transactionId });
}

async function handleActivation(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const licenseKey = typeof body.license_key === "string" ? body.license_key.trim().toUpperCase() : "";
  const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
  if (!licenseKey || !deviceId) return json({ error: "license_key and device_id are required" }, 400);
  const licenseHash = hex(await hmac(env.LICENSE_HASH_SECRET, `hash:${licenseKey}`));
  const row = await env.DB.prepare(
    "SELECT transaction_id, activation_id, device_id FROM orders WHERE license_hash = ?1 AND status = 'completed'",
  ).bind(licenseHash).first();
  if (!row) return json({ status: "INVALID" });
  if (row.activation_id && row.device_id !== deviceId) return json({ status: "LIMIT_REACHED" });
  const activationId = row.activation_id || await makeActivationId();
  await env.DB.prepare(
    "UPDATE orders SET activation_id = ?1, device_id = ?2 WHERE transaction_id = ?3",
  ).bind(activationId, deviceId, row.transaction_id).run();
  return json({ status: "ACTIVATED", activation_id: activationId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    if (request.method === "GET" && url.pathname === "/health") return json({ status: "ok" });
    if (request.method === "POST" && url.pathname === "/v1/paddle/webhook") return handleWebhook(request, env);
    if (request.method === "POST" && url.pathname === "/v1/licenses/claim") return handleClaim(request, env);
    if (request.method === "POST" && url.pathname === "/v1/licenses/activate") return handleActivation(request, env);
    return json({ error: "not found" }, 404);
  },
};


