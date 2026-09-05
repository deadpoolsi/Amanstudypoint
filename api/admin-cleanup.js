// @ts-nocheck
/* ============================================================
   Aman Study Point — One-Click Cleanup (api/admin-cleanup.js)
   ------------------------------------------------------------
   🧹 Eh tool (sirf ADMIN layi) ek click vich safai karda hai:
   1. quizResults (public leaderboard) de HAR entry ton
      PHONE NUMBER hataunda hai (privacy leak fix)
   2. Junk test entries delete karda hai:
      - "AuditTest" wali leaderboard entries
      - users/9000000001 (test node)
      - userAttempts/9000000001 + userAttempts/9999999999
      - pyqList/AUDIT_TEST_KEY
   Page: cleanup.html
   ============================================================ */

const crypto = require("crypto");

const ADMIN_EMAIL = "deadpool73503@gmail.com";
const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;
const WEB_API_KEY = "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw"; // public web key

function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/* Service account nalo OAuth access token */
let cachedToken = null, cachedTokenExpiry = 0;
async function getAdminAccessToken() {
  if (!SERVICE_ACCOUNT) return null;
  if (cachedToken && Date.now() < cachedTokenExpiry - 60000) return cachedToken;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase.database",
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
  if (!tokenData.access_token) return null;
  cachedToken = tokenData.access_token;
  cachedTokenExpiry = Date.now() + (tokenData.expires_in || 3600) * 1000;
  return cachedToken;
}

/* Firebase REST call (admin — rules bypass) */
async function fb(method, path, body) {
  const token = await getAdminAccessToken();
  if (!token) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  const url = `${FIREBASE_DB_URL}/${path}.json?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error("Firebase " + method + " " + path + " fail: " + text.slice(0, 120));
  }
  try { return JSON.parse(text); } catch (e) { return text; }
}

async function verifyAdmin(adminIdToken) {
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: adminIdToken }),
      }
    );
    const d = await r.json();
    const email = d && d.users && d.users[0] && d.users[0].email;
    return email === ADMIN_EMAIL;
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    const { adminIdToken } = req.body || {};

    if (!adminIdToken) {
      return res.status(403).json({ success: false, message: "Admin login chahida hai" });
    }
    const isAdmin = await verifyAdmin(adminIdToken);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "ਸਿਰਫ਼ Admin ਹੀ ਇਹ ਕਰ ਸਕਦਾ ਹੈ!" });
    }
    if (!SERVICE_ACCOUNT) {
      return res.status(500).json({ success: false, message: "FIREBASE_SERVICE_ACCOUNT set nahi hai" });
    }

    const results = [];

    /* ---- 1. Leaderboard ton phone numbers hatao ---- */
    const qr = await fb("GET", "quizResults");
    let phonesStripped = 0, junkEntries = 0;
    if (qr && typeof qr === "object" && !qr.error) {
      for (const [key, val] of Object.entries(qr)) {
        if (val && typeof val === "object") {
          if (val.name === "AuditTest") {
            // 🔧 FIX: PATCH-null kaam nahi karda — PUT null (puri entry delete)
            await fb("PUT", "quizResults/" + encodeURIComponent(key), null);
            junkEntries++;
          } else if ("phone" in val) {
            // 🔧 FIX: entry nu bina phone wapas LIKHO (PUT = pura replace)
            const clean = Object.assign({}, val);
            delete clean.phone;
            await fb("PUT", "quizResults/" + encodeURIComponent(key), clean);
            phonesStripped++;
          }
        }
      }
      if (phonesStripped > 0 || junkEntries > 0) {
        results.push(`🏆 Leaderboard: ${phonesStripped} phone number hatae + ${junkEntries} junk entries delete`);
      } else {
        results.push("🏆 Leaderboard: phone number nahi mile (pehle hi saaf hai)");
      }
    } else {
      results.push("🏆 Leaderboard: khali hai ya parha nahi jaa sakda");
    }

    /* ---- 2. Junk nodes delete ---- */
    const junkPaths = [
      "users/9000000001",
      "userAttempts/9000000001",
      "userAttempts/9999999999",
      "pyqList/AUDIT_TEST_KEY",
    ];
    for (const p of junkPaths) {
      const existing = await fb("GET", p);
      if (existing !== null && !(existing && existing.error)) {
        await fb("PUT", p, null);
        results.push(`🧹 ${p}: delete ho gaya`);
      } else {
        results.push(`✔️ ${p}: pehle hi saaf hai`);
      }
    }

    return res.status(200).json({ success: true, results: results });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error: " + e.message });
  }
};
