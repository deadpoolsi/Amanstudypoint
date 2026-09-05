// @ts-nocheck
/* ============================================================
   Aman Study Point — SECURE Verify Payment (api/verify-payment.js)
   ------------------------------------------------------------
   🔒 SECURITY FIXES:
   1. Signature check (pehle vi si — changa)
   2. NAVA: Razorpay API ton order fetch karke amount check —
      koi ₹1 da order bana ke ₹399 di cheez na lai sake
   3. NAVA: Payment "captured" hona zaroori
   4. NAVA: Idempotency — ikk hi order do vaari use na ho sake
   5. NAVA: Unlock (books/passes) SIRF server likhda hai —
      client (browser) de likhne da rasta band
   ============================================================ */

const crypto = require("crypto");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";

/* Firebase admin access — do tarike:
   (A) FIREBASE_SERVICE_ACCOUNT = poora service account JSON (recommended)
   (B) FIREBASE_DB_SECRET = legacy database secret (jehde aiha kar layo)      */
const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;
const DB_SECRET = process.env.FIREBASE_DB_SECRET || null;

const PASS_DURATIONS = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  sixMonths: 180 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

const ALL_BOOK_IDS = [
  "punjabi", "gk", "maths", "reasoning",
  "history", "science", "constitution", "computer",
];

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/* Service account nalo OAuth access token (zero-dependency, built-in crypto) */
let cachedToken = null, cachedTokenExpiry = 0;
async function getAdminAccessToken() {
  // 🔧 FIX: DB_SECRET nu PEHAL do — OAuth access_token kai project de
  // database te "Unauthorized request" dinda hai. DB_SECRET proven hai
  // (payments mahiniyan toh issi naal chal rahe han).
  if (DB_SECRET) return { secret: DB_SECRET };
  if (!SERVICE_ACCOUNT) throw new Error("Firebase admin credentials missing");

  if (cachedToken && Date.now() < cachedTokenExpiry - 60000)
    return { token: cachedToken };

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(SERVICE_ACCOUNT.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Firebase token mint failed");
  cachedToken = tokenData.access_token;
  cachedTokenExpiry = Date.now() + (tokenData.expires_in || 3600) * 1000;
  return { token: cachedToken };
}

/* Firebase REST call (admin — rules bypass) */
async function fbRequest(method, path, body) {
  const auth = await getAdminAccessToken();
  let url = `${FIREBASE_DB_URL}/${path}.json`;
  if (auth.token) url += `?access_token=${encodeURIComponent(auth.token)}`;
  else url += `?auth=${encodeURIComponent(auth.secret)}`;

  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) throw new Error(`Firebase ${method} ${path}: ${res.status} ${text}`);
  return data;
}

function sanitizeUserKey(k) {
  return typeof k === "string" && k.trim().length >= 3 && !/[\/#$\[\].]/.test(k.trim());
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "ਸਿਰਫ਼ POST allowed ਹੈ।");
  if (!RAZORPAY_KEY_SECRET || (!SERVICE_ACCOUNT && !DB_SECRET))
    return fail(res, 500, "Server keys missing");

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return fail(res, 400, "ਗ਼ਲਤ request format।");
  }

  const {
    razorpay_payment_id, razorpay_order_id, razorpay_signature,
  } = body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature)
    return fail(res, 400, "ਅਧੂਰੀ ਜਾਣਕਾਰੀ (Missing required payment tokens)");

  const phone = String(body.phone || "").trim();
  if (!sanitizeUserKey(phone))
    return fail(res, 400, "ਗ਼ਲਤ ਯੂਜ਼ਰ (phone) ਜਾਣਕਾਰੀ।");

  try {
    /* STEP 1 — Signature check (HMAC SHA256) */
    const expectedSig = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expectedSig !== razorpay_signature)
      return fail(res, 400, "ਅਵੈਧ ਪੇਮੈਂਟ ਸਿਗਨੇਚਰ (Tampered / Fake Payment)");

    /* STEP 2 — Order check (sade Razorpay account vich, server-created) */
    const authHeader =
      "Basic " + Buffer.from(`${RAZORPAY_KEY_ID || ""}:${RAZORPAY_KEY_SECRET}`).toString("base64");

    const orderRes = await fetch(
      `https://api.razorpay.com/v1/orders/${razorpay_order_id}`,
      { headers: { Authorization: authHeader } }
    );
    if (!orderRes.ok) return fail(res, 400, "ਆਰਡਰ ਨਹੀਂ ਮਿਲਿਆ।");
    const order = await orderRes.json();

    const notes = order.notes || {};
    const expectedAmount = parseInt(notes.expected_amount) || 0;
    if (!expectedAmount || order.amount !== expectedAmount)
      return fail(res, 400, "ਆਰਡਰ ਦੀ ਰਕਮ ਮੇਲ ਨਹੀਂ ਖਾਂਦੀ (Amount mismatch)।");

    /* STEP 3 — Payment check (captured + sahi amount) */
    const payRes = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      { headers: { Authorization: authHeader } }
    );
    if (!payRes.ok) return fail(res, 400, "ਪੇਮੈਂਟ ਦੀ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ।");
    const payment = await payRes.json();
    if (payment.status !== "captured")
      return fail(res, 400, "ਪੇਮੈਂਟ ਹਾਲੇ complete ਨਹੀਂ ਹੋਈ।");
    if (payment.amount !== order.amount)
      return fail(res, 400, "ਪੈਸੇ ਦੀ ਰਕਮ ਪੂਰੀ ਨਹੀਂ ਹੈ (Underpaid)।");

    /* STEP 4 — Idempotency (ikk order = ikk hi vaari use) */
    const already = await fbRequest("GET", `paymentOrders/${razorpay_order_id.replace(/[.#$\/\[\]]/g, "_")}`);
    if (already && already.processed) {
      // Pehle hi unlock ho chukka — dubara grant nahi karna
      return res.status(200).json({ success: true, message: "ਪਹਿਲਾਂ ਹੀ ਐਕਟਿਵ ਹੈ।", already: true });
    }

    /* STEP 5 — Grant (SIRF server likhda hai) */
    const type = notes.item_type === "pass" ? "pass" : "book";
    let grantInfo = {};

    if (type === "pass") {
      const planId = notes.plan_id;
      const category = notes.category;
      const durationMs = PASS_DURATIONS[planId];
      if (!durationMs || !/^[a-z0-9]+$/i.test(category || ""))
        return fail(res, 400, "ਆਰਡਰ ਦੀ ਜਾਣਕਾਰੀ ਗ਼ਲਤ ਹੈ।");

      const expiry = Date.now() + durationMs;
      await fbRequest("PATCH", `users/${encodeURIComponent(phone)}/passes`, {
        [category]: expiry,
      });
      grantInfo = { type: "pass", planId, category, expiry };

      // Coupon usedCount server-side update (te admin hi kar sakda hai)
      if (notes.coupon_code) {
        const cp = await fbRequest("GET", `siteSettings/passPricing/${category}/coupon`);
        if (cp && String(cp.code || "").toUpperCase() === String(notes.coupon_code).toUpperCase()) {
          const used = (parseInt(cp.usedCount) || 0) + 1;
          await fbRequest("PATCH", `siteSettings/passPricing/${category}/coupon`, { usedCount: used });
        }
      }
    } else {
      const bookId = notes.book_id;
      if (!/^[a-z0-9_-]+$/i.test(bookId || ""))
        return fail(res, 400, "ਆਰਡਰ ਦੀ ਜਾਣਕਾਰੀ ਗ਼ਲਤ ਹੈ।");

      if (bookId === "combo") {
        // Sarvi kitaaban unlock
        const patch = {};
        ALL_BOOK_IDS.forEach(id => { patch[id] = true; });
        await fbRequest("PATCH", `users/${encodeURIComponent(phone)}/books`, patch);
        grantInfo = { type: "combo", books: ALL_BOOK_IDS };
      } else {
        await fbRequest("PATCH", `users/${encodeURIComponent(phone)}/books`, { [bookId]: true });
        grantInfo = { type: "book", bookId };
      }
    }

    /* STEP 6 — Record (audit + idempotency lai) */
    const record = {
      processed: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount,
      phone,
      name: String(body.name || "Student").slice(0, 60),
      ...grantInfo,
      couponCode: notes.coupon_code || "",
      at: Date.now(),
    };
    await fbRequest("PUT", `paymentOrders/${razorpay_order_id.replace(/[.#$\/\[\]]/g, "_")}`, record);
    await fbRequest("PUT", `payments/${razorpay_payment_id.replace(/[.#$\/\[\]]/g, "_")}`, record);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("verify-payment crash:", err);
    return fail(res, 500, "ਸਰਵਰ ਸਮੱਸਿਆ। WhatsApp te contact karo: 90413-21843");
  }
};
