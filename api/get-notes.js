// @ts-nocheck
/* ============================================================
   Aman Study Point — Get Notes (api/get-notes.js)
   ------------------------------------------------------------
   📝 Study Notes — subjects: Punjab, Math, Punjabi, English,
   Reasoning, Computer, GS (History/Polity/Geography)

   🔒 SECURITY:
   - Notes content bookVault vich hai (admin-only rules — direct
     read band). Student nu sirf EHO API dindi hai.
   - idToken verify (Google public certs — zero API key)
   - Pass check server-side: users/{phone}/passes/note_{subject}
   - Pass nathi → sirf titles/dates (teaser) — content nahi
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const DB_SECRET = process.env.FIREBASE_DB_SECRET || null;

/* 7 pass keys (GS = 1 pass, 3 sub-vaults) */
const PASS_KEYS = [
  "note_punjab", "note_math", "note_punjabi", "note_english",
  "note_reasoning", "note_computer", "note_gs",
];
/* 9 vault keys (GS de 3 sub) */
const VAULT_KEYS = PASS_KEYS.concat([
  "note_gs_history", "note_gs_polity", "note_gs_geography",
]);

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/* 🔒 JWT verify — Google de PUBLIC CERTS naal (zero API key) */
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

    return payload;
  } catch (e) {
    return null;
  }
}

/* Firebase REST (admin — rules bypass) */
async function fbGet(path) {
  const url = `${FIREBASE_DB_URL}/${path}.json?auth=${encodeURIComponent(DB_SECRET)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firebase GET ${path}: ${res.status}`);
  return res.json();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "ਸਿਰਫ਼ POST allowed ਹੈ।");
  if (!DB_SECRET) return fail(res, 500, "Server keys missing");

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return fail(res, 400, "ਗ਼ਲਤ request format।");
  }

  const passKey = String(body.pass || "").trim();
  const vaultKey = String(body.vault || "").trim();
  if (!PASS_KEYS.includes(passKey)) return fail(res, 400, "ਗ਼ਲਤ subject।");
  if (!VAULT_KEYS.includes(vaultKey)) return fail(res, 400, "ਗ਼ਲਤ vault।");
  /* vault di ownership: pass key naal matchna chahida (GS sub-check) */
  if (vaultKey !== passKey && vaultKey.indexOf(passKey + "_") !== 0)
    return fail(res, 400, "ਗ਼ਲਤ subject combination।");

  try {
    /* 1) Login verify → phone */
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email) return fail(res, 401, "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।");
    const m = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!m) return fail(res, 401, "ਸਿਰਫ਼ vidiarathi notes padh sakde han।");
    const phone = m[1];

    /* 2) Pass check — server-side */
    const expiry = await fbGet(`users/${encodeURIComponent(phone)}/passes/${passKey}`);
    const hasPass = (typeof expiry === "number") && expiry > Date.now();

    /* 3) Notes list lao */
    const vault = await fbGet(`bookVault/${vaultKey}`) || {};
    let notes = Object.keys(vault).map(function (id) {
      const n = vault[id] || {};
      return { id: id, t: n.t || "Untitled", k: n.k || "pdf", u: n.u || "", c: n.c || "", d: n.d || "", at: n.at || 0 };
    });
    notes.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });

    /* 4) Pass nathi → sirf teaser (titles + dates) */
    if (!hasPass) {
      notes = notes.map(function (n) {
        return { id: n.id, t: n.t, k: n.k, d: n.d };
      });
    }

    return res.status(200).json({ success: true, hasPass: hasPass, notes: notes });
  } catch (err) {
    console.error("get-notes crash:", err);
    return fail(res, 500, "ਸਰਵਰ ਸਮੱਸਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।");
  }
};
