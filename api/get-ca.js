// @ts-nocheck
/* ============================================================
   Aman Study Point — Secure Content API (api/get-ca.js)
   ------------------------------------------------------------
   🔒 CONTENT BRANCHES (12-function Hobby limit — is layi
   navi function file NAHI, eh hi vich branches han):
     1. 🌍 CA (Current Affairs): { section, month, phone, idToken }
     2. 📝 NOTES: { fn: "notes", idToken, pass, vault }
        (pehla api/get-notes.js si — Hobby limit 12 karke
        alag file deploy nahi ho saki, is layi eh vich shamil)

   🔒 SECURITY:
   - currentAffairs/bookVault nodes PUBLICLY padhe nahi ja sakde
     (rules .read: false) — sirf eh API (DB secret naal) dindi hai.
   - idToken verify = Google PUBLIC CERTS (JWT) — API key di
     lod nahi (identitytoolkit key server toh blocked si).
   - CA: demo month → sirf login; baaki → users/{phone}/passes/ca
   - Notes: users/{phone}/passes/note_{subject} server-side check;
     pass nahi → sirf titles (teaser), content nahi.
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;

const CA_PASS_CAT = "ca";
const ADMIN_EMAIL = "deadpool73503@gmail.com";
const VALID_SECTIONS = [
  "daysThemes",
  "gkBytes",
  "appointments",
  "awards",
  "govtSchemes",
  "sports",
  "events",
  "reports"
];

/* 📝 Notes — 7 pass keys (GS = 1 pass, 3 sub-vaults) + 9 vault keys */
const NOTE_PASS_KEYS = [
  "note_punjab", "note_math", "note_punjabi", "note_english",
  "note_reasoning", "note_computer", "note_gs",
];
const NOTE_VAULT_KEYS = NOTE_PASS_KEYS.concat([
  "note_gs_history", "note_gs_polity", "note_gs_geography",
]);

function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/* 🔒 JWT verify — Google de PUBLIC CERTS naal (zero API key).
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

/* Firebase REST GET (admin — rules bypass) */
async function fbGet(path) {
  const res = await fetch(
    `${FIREBASE_DB_URL}/${path}.json?auth=${encodeURIComponent(FIREBASE_DB_SECRET)}`
  );
  if (!res.ok) throw new Error(`Firebase GET ${path}: ${res.status}`);
  return res.json();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }
  if (!FIREBASE_DB_SECRET) {
    return res
      .status(500)
      .json({ success: false, message: "Server config missing (FIREBASE_DB_SECRET)" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ success: false, message: "ਗ਼ਲਤ request format।" });
  }

  /* ═══════════ 📝 NOTES BRANCH ═══════════ */
  if (body.fn === "notes") {
    const passKey = String(body.pass || "").trim();
    const vaultKey = String(body.vault || "").trim();
    if (!NOTE_PASS_KEYS.includes(passKey))
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ subject।" });
    if (!NOTE_VAULT_KEYS.includes(vaultKey))
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ vault।" });
    if (vaultKey !== passKey && vaultKey.indexOf(passKey + "_") !== 0)
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ subject combination।" });

    try {
      /* 1) Login verify → phone (sirf vidiarathi) */
      const payload = await verifyIdToken(String(body.idToken || ""));
      if (!payload || !payload.email)
        return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
      const m = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
      if (!m)
        return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ vidiarathi notes padh sakde han।" });
      const phone = m[1];

      /* 2) Pass check — server-side */
      const expiry = await fbGet(`users/${encodeURIComponent(phone)}/passes/${passKey}`);
      const hasPass = (typeof expiry === "number") && expiry > Date.now();

      /* 3) Notes list lao */
      const vault = (await fbGet(`bookVault/${vaultKey}`)) || {};
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
    } catch (e) {
      console.error("get-notes branch crash:", e);
      return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }
  }

  /* ═══════════ 🌍 CA BRANCH (original) ═══════════ */
  try {
    const { section, month, phone, idToken } = body;

    if (!section || !month) {
      return res.status(400).json({ success: false, message: "section/month missing" });
    }
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ section ਹੈ!" });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ month format" });
    }

    // Content lao (sirf DB secret naal — public access zero)
    const data = await fbGet(
      `currentAffairs/${encodeURIComponent(section)}/${encodeURIComponent(month)}`
    );
    if (!data || typeof data.content !== "string" || !data.content.trim()) {
      return res
        .status(404)
        .json({ success: false, message: "ਇਹ ਮਹੀਨਾ ਹਾਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ!" });
    }

    // 1) Login (identity) verify — student apne phone-email naal, Admin apne email naal
    const payload = await verifyIdToken(idToken);
    const email = (payload && payload.email) || null;
    if (!email) {
      return res
        .status(403)
        .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਲੌਗਇਨ ਕਰੋ" });
    }
    const isAdmin = (String(email).trim().toLowerCase() === ADMIN_EMAIL);
    if (!isAdmin && email !== `${phone}@amanstudypoint.student`) {
      return res
        .status(403)
        .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਲੌਗਇਨ ਕਰੋ" });
    }

    // 2) Demo month nahi → PASS check (server-side)
    //    👑 Admin nu pass-check ton mukt — preview kar sakda hai
    if (data.demo !== true && !isAdmin) {
      const expiry = await fbGet(
        `users/${encodeURIComponent(phone)}/passes/${CA_PASS_CAT}`
      );
      if (!expiry || typeof expiry !== "number" || expiry <= Date.now()) {
        return res
          .status(403)
          .json({ success: false, message: "Pass active nahi hai — pass khareedo", passRequired: true });
      }
    }

    return res.status(200).json({
      success: true,
      title: data.title || month,
      content: data.content
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "ਸਰਵਰ ਵਿੱਚ ਸਮੱਸਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ" });
  }
};
