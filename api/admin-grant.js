// @ts-nocheck
/* ============================================================
   Aman Study Point — Admin Grant (api/admin-grant.js)
   ------------------------------------------------------------
   🎁 Free Pass manual unlock — SIRF admin (deadpool73503@gmail.com)
   lai. Client direct users/{phone}/passes nahi likh sakda
   (rules vich .write:false hai — payment-bypass di security).
   Eho API server-side (DB_SECRET) naal likhda hai.

   POST { idToken, action: "grant" | "revoke", phone, cat, days }
   - grant: expiry = max(now, jaari expiry) + days
   - revoke: expiry = past (data delete nahi hunda)
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const WEB_API_KEY = "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Eix1EzMw";
const ADMIN_EMAIL = "deadpool73503@gmail.com";

const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;
const DB_SECRET = process.env.FIREBASE_DB_SECRET || null;

/* Pass categories (tests.html catMeta + CA page) */
const VALID_CATS = [
  "police", "patwari", "clerk", "ssc", "ptet1", "ptet2",
  "banking", "current", "ca",
];

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/* Service account nalo OAuth access token (zero-dependency) —
   DB_SECRET nu PEHAL do (verify-payment wala proven pattern) */
let cachedToken = null, cachedTokenExpiry = 0;
async function getAdminAccessToken() {
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
  const crypto = require("crypto");
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

/* 🔒 JWT verify — Google de PUBLIC CERTS naal (ZERO API key).
   FIX: identitytoolkit accounts:lookup browser-restricted key nal
   server toh "API key not valid" dinda si. Public certs hamesha
   kamde — kisi key di lod nahi. */
let __certsCache = null, __certsAt = 0;
async function verifyIdToken(idToken) {
  try {
    const tok = String(idToken || "");
    const parts = tok.split(".");
    if (parts.length !== 3) return null;
    const b64d = function (x) {
      return Buffer.from(String(x).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    };
    let header, payload;
    try {
      header = JSON.parse(b64d(parts[0]));
      payload = JSON.parse(b64d(parts[1]));
    } catch (e) { return null; }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    if (payload.aud !== "aman-study-point") return null;
    if (payload.iss !== "https://securetoken.google.com/aman-study-point") return null;

    if (!__certsCache || (Date.now() - __certsAt) > 3600000) {
      const cr = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
      if (!cr.ok) return null;
      __certsCache = await cr.json();
      __certsAt = Date.now();
    }
    const cert = __certsCache[header.kid];
    if (!cert) return null;

    const crypto = require("crypto");
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(parts[0] + "." + parts[1]);
    const sig = Buffer.from(String(parts[2]).replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (!verifier.verify(cert, sig)) return null;

    return payload; /* .email, .sub hunde ne */
  } catch (e) {
    return null;
  }
}

/* 🔒 sirf asli admin email manna (case-insensitive — jivein admin.html karda) */
async function verifyAdmin(idToken) {
  const payload = await verifyIdToken(idToken);
  if (!payload || !payload.email) return false;
  return String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "ਸਿਰਫ਼ POST allowed ਹੈ।");
  if (!DB_SECRET && !SERVICE_ACCOUNT)
    return fail(res, 500, "Server keys missing");

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return fail(res, 400, "ਗ਼ਲਤ request format।");
  }

  const idToken = String(body.idToken || "");
  if (!idToken) return fail(res, 401, "Admin login ਨਹੀਂ ਹੈ।");

  const isAdmin = await verifyAdmin(idToken);
  if (!isAdmin) return fail(res, 403, "ਸਿਰਫ਼ admin ਦੀ ਇਜਾਜ਼ਤ ਹੈ।");

  const action = String(body.action || "grant");
  const phone = String(body.phone || "").trim();
  const cat = String(body.cat || "").trim();

  if (!/^\d{10}$/.test(phone)) return fail(res, 400, "ਪੂਰਾ 10 ਅੰਕਾਂ ਦਾ ਫ਼ੋਨ ਨੰਬਰ ਲਿਖੋ।");
  if (!VALID_CATS.includes(cat)) return fail(res, 400, "ਗ਼ਲਤ category।");

  try {
    if (action === "revoke") {
      /* 🔒 pass band — expiry bita hua (data delete nahi) */
      await fbRequest("PATCH", `users/${encodeURIComponent(phone)}/passes`, {
        [cat]: Date.now() - 1000,
      });
      return res.status(200).json({ success: true, revoked: true });
    }

    if (action !== "grant")
      return fail(res, 400, "ਗ਼ਲਤ action।");

    const days = parseInt(body.days, 10);
    if (!days || days < 1 || days > 999)
      return fail(res, 400, "ਦਿਨ 1 ਤੋਂ 999 ਦੇ ਵਿੱਚ ਰੱਖੋ।");

    /* 📊 jaari expiry paddo (naam vi) */
    const [curExpiry, nameNode] = await Promise.all([
      fbRequest("GET", `users/${encodeURIComponent(phone)}/passes/${cat}`),
      fbRequest("GET", `users/${encodeURIComponent(phone)}/name`),
    ]);

    /* 🎁 extend logic: base = max(now, jaari expiry) */
    const cur = (typeof curExpiry === "number") ? curExpiry : 0;
    const base = Math.max(Date.now(), cur);
    const newExpiry = base + days * 24 * 60 * 60 * 1000;

    await fbRequest("PATCH", `users/${encodeURIComponent(phone)}/passes`, {
      [cat]: newExpiry,
    });

    return res.status(200).json({
      success: true,
      expiry: newExpiry,
      extended: cur > Date.now(),
      name: (typeof nameNode === "string") ? nameNode : null,
    });
  } catch (err) {
    console.error("admin-grant crash:", err);
    return fail(res, 500, "ਸਰਵਰ ਸਮੱਸਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।");
  }
};
