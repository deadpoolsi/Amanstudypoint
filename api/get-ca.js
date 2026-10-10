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
     3. 📎 NOTES FILE: { fn: "file", idToken, pass, vault, id }
        (admin de directly-upload kite PDF — bookVault/__files)

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

/* 🤖 AI STUDY HELPER (Gemini) — key server-side ENV vich (browser vich kade nahi)
   Model fallback chain: Google models retire kar dinda (gemini-2.0-flash June 2026 ch shut down si),
   is lai ENV model + nawe models try hunde rehnde, jehra chalde ohna chal janda */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODELS = [];
if (process.env.GEMINI_MODEL) GEMINI_MODELS.push(process.env.GEMINI_MODEL);
["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"].forEach(function (m) {
  if (GEMINI_MODELS.indexOf(m) === -1) GEMINI_MODELS.push(m);
});
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

  /* ═══════════ 🤖 AI STUDY HELPER BRANCH — { fn: "ask", idToken, q }
     (Gemini API — one-line Punjabi answers, key ENV vich server-side) ═══════════ */
  if (body.fn === "ask") {
    const q = String(body.q || "").trim();
    if (!q) return res.status(400).json({ success: false, message: "ਸਵਾਲ ਲਿਖੋ ਜੀ।" });
    if (q.length > 300)
      return res.status(400).json({ success: false, message: "ਛੋਟਾ ਜਿਹਾ ਸਵਾਲ ਲਿਖੋ (ਵੱਧ ਤੋਂ ਵੱਧ 300 ਅੱਖਰ)।" });
    if (!GEMINI_API_KEY)
      return res.status(500).json({ success: false, message: "AI service ਹਾਲੇ off ਹੈ (GEMINI_API_KEY set ਨਹੀਂ) — admin ਨੂੰ ਦੱਸੋ।" });

    /* 🔒 sirf login kite students/admin — koie random call nahi kar sakda */
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const isAdmin = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const m = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!m && !isAdmin)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਪੁੱਛ ਸਕਦੇ ਹਨ।" });

    try {
      const sysPrompt =
        "ਤੂੰ 'Aman Study Point' (ਪੰਜਾਬ ਦੀਆਂ competitive exams: Police, Patwari, SSC, Banking, TET, Current Affairs) ਦਾ AI study helper ਹੈਂ। " +
        "ਵਿਦਿਆਰਥੀ ਦੇ ਪੜ੍ਹਾਈ ਸਬੰਧੀ ਸਵਾਲ ਦਾ ਸਿਰਫ਼ ਇੱਕ ਲਾਈਨ (1-2 ਵਾਕ ਵੱਧ ਤੋਂ ਵੱਧ) ਦਾ ਸਿੱਧਾ ਜਵਾਬ ਪੰਜਾਬੀ (Gurmukhi) ਵਿੱਚ ਦੇ। " +
        "ਲੰਮੀ ਵਿਆਖਿਆ, ਬੁਲੈਟ ਪਾਇੰਟ, ਸਵਾਲ ਵਾਪਸ ਪੁੱਛਣਾ — ਕੁਝ ਨਹੀਂ। ਜੇ ਸਵਾਲ ਪੜ੍ਹਾਈ ਦਾ ਨਹੀਂ ਹੈ ਤਾਂ ਬੱਸ ਇੱਕ ਲਾਈਨ ਵਿੱਚ ਕਹਿ ਦੇ: 'ਸਿਰਫ਼ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲ ਪੁੱਛੋ ਜੀ'। " +
        "ਅੰਕੜੇ/ਮਿਤੀਆਂ ਬਾਰੇ ਪੱਕਾ ਨਾ ਪਤਾ ਹੋਵੇ ਤਾਂ ਇੱਕ ਲਾਈਨ ਵਿੱਚ ਸੱਚ ਦੱਸ ਦੇ।";
      const callGemini = async function (model, noThinking) {
        const genCfg = { maxOutputTokens: noThinking ? 250 : 600, temperature: 0.2 };
        if (noThinking) genCfg.thinkingConfig = { thinkingBudget: 0 }; /* thinking models de tokens bachaun lai */
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: sysPrompt }] },
              contents: [{ parts: [{ text: q }] }],
              generationConfig: genCfg
            })
          }
        );
        return r.json().catch(() => null);
      };
      const pickText = function (d) {
        if (!d || !d.candidates || !d.candidates[0] || !d.candidates[0].content || !Array.isArray(d.candidates[0].content.parts)) return "";
        let t = "";
        d.candidates[0].content.parts.forEach(function (p) {
          if (p && typeof p.text === "string" && !p.thought) t += p.text;
        });
        return t;
      };

      let text = "";
      let lastErr = "";
      for (let i = 0; i < GEMINI_MODELS.length && !text; i++) {
        const model = GEMINI_MODELS[i];
        let d = await callGemini(model, false);
        text = pickText(d);
        if (!text) {
          /* ਸ਼ਾਇਦ thinking ne saare tokens kha ley — thinking off karke retry */
          const fr = d && d.candidates && d.candidates[0] && d.candidates[0].finishReason;
          if (fr === "MAX_TOKENS") {
            d = await callGemini(model, true);
            text = pickText(d);
          }
        }
        if (!text) {
          lastErr = d && d.error
            ? String(d.error.status || "") + " " + String(d.error.message || "")
            : "no response";
          console.error("AI ask fail (" + model + "): " + lastErr.slice(0, 250));
          /* key ਗ਼ਲਤ ਹੋਵੇ ਤਾਂ ਬਾਕੀ models try karna besuda */
          if (/API_KEY_INVALID|PERMISSION_DENIED/i.test(lastErr)) break;
        }
      }
      if (!text) {
        if (/API_KEY_INVALID/i.test(lastErr))
          return res.status(401).json({ success: false, message: "Gemini API key ਗ਼ਲਤ ਹੈ — admin ENV check ਕਰੇ।" });
        if (/PERMISSION_DENIED/i.test(lastErr))
          return res.status(401).json({ success: false, message: "API key ਦੀ Generative AI access off ਹੈ — Google AI Studio ਚੈੱਕ ਕਰੇ।" });
        const quotaHit = /quota|429|RESOURCE_EXHAUSTED/i.test(lastErr);
        return res.status(quotaHit ? 429 : 502).json({
          success: false,
          message: quotaHit
            ? "ਅੱਜ ਦੀ AI limit ਪੂਰੀ ਹੋ ਗਈ — ਕੱਲ੍ਹ ਫੇਰ ਪੁੱਛੋ ਜੀ।"
            : "AI ਜਵਾਬ ਨਹੀਂ ਦੇ ਸਕਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
        });
      }
      return res.status(200).json({ success: true, a: String(text).trim().slice(0, 800) });
    } catch (e) {
      console.error("AI ask branch crash:", e);
      return res.status(502).json({ success: false, message: "AI service ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ — ਥੋੜ੍ਹੀ ਉਡੀਕ ਪਿੱਛੋਂ ਦੁਬਾਰਾ।" });
    }
  }

  /* ═══════════ 📝 AI PRACTICE TEST BRANCH — { fn: "practice", idToken, topic, count }
     (AI khud MCQ test banaunda — JSON mode, 1 call = poora test) ═══════════ */
  if (body.fn === "practice") {
    const topic = String(body.topic || "").trim();
    const count = Number(body.count) === 10 ? 10 : 5;
    if (topic.length < 2)
      return res.status(400).json({ success: false, message: "Topic ਲਿਖੋ ਜੀ।" });
    if (topic.length > 120)
      return res.status(400).json({ success: false, message: "ਛੋਟਾ ਜਿਹਾ topic ਲਿਖੋ।" });
    if (!GEMINI_API_KEY)
      return res.status(500).json({ success: false, message: "AI service ਹਾਲੇ off ਹੈ — admin ਨੂੰ ਦੱਸੋ।" });

    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const isAdminP = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const mP = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!mP && !isAdminP)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵਰਤ ਸਕਦੇ ਹਨ।" });

    try {
      const promptTxt =
        "ਹੇਠ ਦਿੱਤੇ topic ਤੋਂ " + count + " multiple-choice ਸਵਾਲ ਬਣਾਓ — ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ) ਵਿੱਚ, ਪੰਜਾਬ ਦੀਆਂ competitive exams (Police, Patwari, SSC, Banking, TET, Current Affairs) ਦੇ level ਤੇ। Topic: " + topic + "\n" +
        'ਸਿਰਫ਼ STRICT JSON return ਕਰੋ — ਇੱਕ array, ਹਰ item: {"q": "ਸਵਾਲ", "o": ["ਜਵਾਬ1","ਜਵਾਬ2","ਜਵਾਬ3","ਜਵਾਬ4"], "a": ਸਹੀ ਜਵਾਬ ਦਾ index (0,1,2 ਜਾਂ 3)}। ਕੋਈ ਵਿਆਖਿਆ ਨਹੀਂ, ਕੋਈ markdown ਨਹੀਂ — ਸਿਰਫ਼ JSON।';
      const callP = async function (model, withThinking) {
        const genCfg = {
          maxOutputTokens: count === 10 ? 3000 : 1800,
          temperature: 0.4,
          responseMimeType: "application/json"
        };
        if (withThinking) genCfg.thinkingConfig = { thinkingBudget: 0 };
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: "ਤੂੰ exam questions generator ਹੈਂ — ਹਮੇਸ਼ਾ ਸਿਰਫ਼ valid JSON output ਕਰਦਾ ਹੈਂ, ਕੁਝ ਹੋਰ ਨਹੀਂ।" }] },
              contents: [{ parts: [{ text: promptTxt }] }],
              generationConfig: genCfg
            })
          }
        );
        return r.json().catch(() => null);
      };
      const pickTextP = function (d) {
        if (!d || !d.candidates || !d.candidates[0] || !d.candidates[0].content || !Array.isArray(d.candidates[0].content.parts)) return "";
        let t = "";
        d.candidates[0].content.parts.forEach(function (p) {
          if (p && typeof p.text === "string" && !p.thought) t += p.text;
        });
        return t;
      };

      let text = "";
      let lastErr = "";
      for (let i = 0; i < GEMINI_MODELS.length && !text; i++) {
        const model = GEMINI_MODELS[i];
        let d = await callP(model, false);
        text = pickTextP(d);
        if (!text) {
          lastErr = d && d.error
            ? String(d.error.status || "") + " " + String(d.error.message || "")
            : "no response";
          console.error("AI practice fail (" + model + "): " + lastErr.slice(0, 250));
          if (/API_KEY_INVALID|PERMISSION_DENIED/i.test(lastErr)) break;
          /* thinking ne saare tokens kha ley hove (MAX_TOKENS) — thinking off karke retry */
          const frP = d && d.candidates && d.candidates[0] && d.candidates[0].finishReason;
          if (frP === "MAX_TOKENS") {
            d = await callP(model, true);
            text = pickTextP(d);
            if (!text) {
              lastErr = d && d.error ? String(d.error.status || "") + " " + String(d.error.message || "") : "MAX_TOKENS empty";
            }
          }
        }
      }
      if (!text) {
        if (/API_KEY_INVALID/i.test(lastErr))
          return res.status(401).json({ success: false, message: "Gemini API key ਗ਼ਲਤ ਹੈ — admin ENV check ਕਰੇ।" });
        const quotaHit = /quota|429|RESOURCE_EXHAUSTED/i.test(lastErr);
        return res.status(quotaHit ? 429 : 502).json({
          success: false,
          message: quotaHit
            ? "ਅੱਜ ਦੀ AI limit ਪੂਰੀ ਹੋ ਗਈ — ਕੱਲ੍ਹ ਫੇਰ ਪੁੱਛੋ ਜੀ।"
            : "AI ਟੈਸਟ ਨਹੀਂ ਬਣਾ ਸਕਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
        });
      }

      /* JSON parse + validate — AI ਥੋੜਾ ਵੀ ਬਦਸੂਰਤ ਜਵਾਬ ਦੇਵੇ ਤਾਂ ਸਾਫ਼ ਕਰੀਏ */
      let qs = null;
      try {
        let raw = String(text).trim();
        const fIdx = raw.indexOf("[");
        const lIdx = raw.lastIndexOf("]");
        if (fIdx !== -1 && lIdx > fIdx) raw = raw.slice(fIdx, lIdx + 1);
        qs = JSON.parse(raw);
      } catch (e) { qs = null; }
      if (!Array.isArray(qs))
        return res.status(502).json({ success: false, message: "AI ਟੈਸਟ ਨਹੀਂ ਬਣਾ ਸਕਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
      const clean = [];
      for (let i = 0; i < qs.length && clean.length < count; i++) {
        const it = qs[i];
        if (it && typeof it.q === "string" && it.q.trim() &&
            Array.isArray(it.o) && it.o.length === 4 &&
            typeof it.o[0] === "string" && typeof it.o[1] === "string" &&
            typeof it.o[2] === "string" && typeof it.o[3] === "string" &&
            (it.a === 0 || it.a === 1 || it.a === 2 || it.a === 3)) {
          clean.push({
            q: it.q.slice(0, 400),
            o: [it.o[0].slice(0, 200), it.o[1].slice(0, 200), it.o[2].slice(0, 200), it.o[3].slice(0, 200)],
            a: it.a
          });
        }
      }
      if (!clean.length)
        return res.status(502).json({ success: false, message: "AI ਟੈਸਟ ਨਹੀਂ ਬਣਾ ਸਕਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
      return res.status(200).json({ success: true, questions: clean });
    } catch (e) {
      console.error("AI practice branch crash:", e);
      return res.status(502).json({ success: false, message: "AI service ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ — ਥੋੜ੍ਹੀ ਉਡੀਕ ਪਿੱਛੋਂ ਦੁਬਾਰਾ।" });
    }
  }

  /* ═══════════ 📸 PHOTO ASK BRANCH — { fn: "askphoto", idToken, img }
     (kitaab de sawal di photo → Gemini nu vekh ke ik-line jawaab) ═══════════ */
  if (body.fn === "askphoto") {
    const img = typeof body.img === "string" ? body.img : "";
    if (!img)
      return res.status(400).json({ success: false, message: "ਫੋਟੋ ਨਹੀਂ ਮਿਲੀ।" });
    if (img.length > 3500000)
      return res.status(400).json({ success: false, message: "ਫੋਟੋ ਬਹੁਤ ਵੱਡੀ ਹੈ — ਨੇੜੇ ਤੋਂ ਸਿਰਫ਼ ਸਵਾਲ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।" });
    if (!GEMINI_API_KEY)
      return res.status(500).json({ success: false, message: "AI service ਹਾਲੇ off ਹੈ — admin ਨੂੰ ਦੱਸੋ।" });

    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const isAdminPh = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const mPh = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!mPh && !isAdminPh)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵਰਤ ਸਕਦੇ ਹਨ।" });

    try {
      const sysPh =
        "ਤੂੰ 'Aman Study Point' ਦਾ AI study helper ਹੈਂ। ਵਿਦਿਆਰਥੀ ਕਿਤਾਬ ਦੇ ਸਵਾਲ ਦੀ ਫੋਟੋ ਭੇਜਦਾ ਹੈ — ਸਵਾਲ ਪੜ੍ਹ ਕੇ ਸਿਰਫ਼ ਇੱਕ ਲਾਈਨ ਦਾ ਸਿੱਧਾ ਜਵਾਬ ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ) ਵਿੱਚ ਦੇ। " +
        "ਜੇ ਫੋਟੋ ਵਿੱਚ ਕਈ ਸਵਾਲ ਹੋਣ ਤਾਂ ਸਭ ਤੋਂ ਪਹਿਲੇ ਸਵਾਲ ਦਾ ਜਵਾਬ ਦੇ। ਲੰਮੀ ਵਿਆਖਿਆ ਨਹੀਂ।";
      const phPrompt =
        "ਇਸ ਫੋਟੋ ਵਿੱਚ ਜੋ ਵੀ ਪੜ੍ਹਾਈ ਦਾ ਸਵਾਲ ਦਿਸਦਾ ਹੈ ਉਸ ਦਾ ਇੱਕ ਲਾਈਨ ਦਾ ਜਵਾਬ ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ) ਵਿੱਚ ਦੇ। " +
        "ਜੇ ਫੋਟੋ ਵਿੱਚ ਕੋਈ ਸਵਾਲ ਨਹੀਂ ਦਿਸਦਾ ਜਾਂ ਧੁੰਦਲੀ ਹੈ ਤਾਂ ਬੱਸ ਕਹਿ: 'ਫੋਟੋ ਸਾਫ਼ ਨਹੀਂ ਹੈ — ਸਿਰਫ਼ ਸਵਾਲ ਵਾਲਾ ਹਿੱਸਾ ਖਿੱਚੋ'।";
      const callPh = async function (model) {
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: sysPh }] },
              contents: [{ parts: [
                { inline_data: { mime_type: "image/jpeg", data: img } },
                { text: phPrompt }
              ] }],
              generationConfig: { maxOutputTokens: 300, temperature: 0.2 }
            })
          }
        );
        return r.json().catch(() => null);
      };
      const pickTextPh = function (d) {
        if (!d || !d.candidates || !d.candidates[0] || !d.candidates[0].content || !Array.isArray(d.candidates[0].content.parts)) return "";
        let t = "";
        d.candidates[0].content.parts.forEach(function (p) {
          if (p && typeof p.text === "string" && !p.thought) t += p.text;
        });
        return t;
      };

      let text = "";
      let lastErr = "";
      for (let i = 0; i < GEMINI_MODELS.length && !text; i++) {
        const model = GEMINI_MODELS[i];
        const d = await callPh(model);
        text = pickTextPh(d);
        if (!text) {
          lastErr = d && d.error
            ? String(d.error.status || "") + " " + String(d.error.message || "")
            : "no response";
          console.error("AI photo fail (" + model + "): " + lastErr.slice(0, 250));
          if (/API_KEY_INVALID|PERMISSION_DENIED/i.test(lastErr)) break;
        }
      }
      if (!text) {
        if (/API_KEY_INVALID/i.test(lastErr))
          return res.status(401).json({ success: false, message: "Gemini API key ਗ਼ਲਤ ਹੈ — admin ENV check ਕਰੇ।" });
        const quotaHit = /quota|429|RESOURCE_EXHAUSTED/i.test(lastErr);
        return res.status(quotaHit ? 429 : 502).json({
          success: false,
          message: quotaHit
            ? "ਅੱਜ ਦੀ AI limit ਪੂਰੀ ਹੋ ਗਈ — ਕੱਲ੍ਹ ਫੇਰ ਪੁੱਛੋ ਜੀ।"
            : "ਫੋਟੋ ਦਾ ਜਵਾਬ ਨਹੀਂ ਮਿਲਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
        });
      }
      return res.status(200).json({ success: true, a: String(text).trim().slice(0, 800) });
    } catch (e) {
      console.error("AI photo branch crash:", e);
      return res.status(502).json({ success: false, message: "AI service ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ — ਥੋੜ੍ਹੀ ਉਡੀਕ ਪਿੱਛੋਂ ਦੁਬਾਰਾ।" });
    }
  }

  /* ═══════════ 💰 REFERRAL: refsync (newbie jodda) ═══════════ */
  if (body.fn === "refsync") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const mRs = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    const isAdminRs = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (!mRs && !isAdminRs)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵਰਤ ਸਕਦੇ ਹਨ।" });
    const nb = mRs ? mRs[1] : "";
    const ref = String(body.ref || "").replace(/\D/g, "").slice(0, 10);
    if (!nb)
      return res.status(400).json({ success: true, done: false, message: "" });
    if (ref.length !== 10)
      return res.status(400).json({ success: false, message: "Referral code ਗ਼ਲਤ ਹੈ।" });
    if (ref === nb)
      return res.status(400).json({ success: true, done: false, message: "ਆਪਣਾ ਆਪ refer ਨਹੀਂ ਕਰ ਸਕਦੇ 😊" });
    try {
      const refUser = await fbGet("users/" + encodeURIComponent(ref));
      if (!refUser)
        return res.status(400).json({ success: true, done: false, message: "ਇਹ referral code ਵਾਲਾ student ਨਹੀਂ ਮਿਲਿਆ।" });
      const all = (await fbGet("referrals")) || {};
      let nbSeen = false, refApproved = 0;
      Object.keys(all).forEach(function (k) {
        const e = all[k] || {};
        if (e.nb === nb) nbSeen = true;
        if (e.ref === ref && e.status === "approved") refApproved++;
      });
      if (nbSeen)
        return res.status(200).json({ success: true, done: false, message: "ਤੁਸੀਂ ਪਹਿਲਾਂ ਹੀ refer ਹੋ ਚੁੱਕੇ ਹੋ।" });
      if (refApproved >= 2)
        return res.status(200).json({ success: true, done: false, message: "ਇਹ code ਦੀ reward limit (2) ਪੂਰੀ ਹੈ।" });
      await fetch(FIREBASE_DB_URL + "/referrals.json?auth=" + encodeURIComponent(FIREBASE_DB_SECRET), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: ref, nb: nb, at: Date.now(), status: "pending" })
      });
      return res.status(200).json({ success: true, done: true, message: "Referral ਜੁੜ ਗਿਆ ✅ — ਦੋਸਤ 5 ਟੈਸਟ + 3 ਦਿਨ ਪੂਰੇ ਕਰੇ ਤਾਂ reward ਮਿਲੇਗਾ।" });
    } catch (e) {
      console.error("refsync crash:", e);
      return res.status(502).json({ success: false, message: "ਇੰਟਰਨੈੱਟ ਸਮੱਸਿਆ — ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ।" });
    }
  }

  /* ═══════════ 💰 REFERRAL: refstatus (apan referrals dekhda) ═══════════ */
  if (body.fn === "refstatus") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const mSt = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!mSt)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵੇਖ ਸਕਦੇ ਹਨ।" });
    const phone = mSt[1];
    try {
      const all = (await fbGet("referrals")) || {};
      const mine = [];
      let approved = 0;
      Object.keys(all).forEach(function (k) {
        const e = all[k] || {};
        if (e.ref !== phone) return;
        if (e.status === "approved") approved++;
        const nbS = String(e.nb || "");
        mine.push({
          id: k,
          nb: nbS.slice(0, 2) + "••••" + nbS.slice(-4),
          at: Number(e.at) || 0,
          status: String(e.status || "pending")
        });
      });
      mine.sort(function (a, b) { return b.at - a.at; });
      return res.status(200).json({ success: true, mine: mine.slice(0, 20), approved: approved, cap: 2 });
    } catch (e) {
      console.error("refstatus crash:", e);
      return res.status(502).json({ success: false, message: "ਲੋਡ ਨਹੀਂ ਹੋਇਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }
  }

  /* ═══════════ 💰 REFERRAL: reflist (admin — eligibility calculate) ═══════════ */
  if (body.fn === "reflist") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email || String(payload.email).trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase())
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ admin।" });
    try {
      const all = (await fbGet("referrals")) || {};
      const keys = Object.keys(all).sort(function (a, b) {
        return (Number(all[b] && all[b].at) || 0) - (Number(all[a] && all[a].at) || 0);
      }).slice(0, 30);
      const list = [];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const e = all[k] || {};
        const at = Number(e.at) || 0;
        let tests = 0;
        const days = {};
        try {
          const att = (await fbGet("userAttempts/" + encodeURIComponent(String(e.nb || "")))) || {};
          Object.keys(att).forEach(function (ak) {
            const a = att[ak];
            if (!a) return;
            const aAt = Number(a.at) || 0;
            if (at && aAt < at) return;
            tests++;
            const d = new Date(aAt || Date.now());
            days[d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()] = 1;
          });
        } catch (e2) { /* attempts na mile = 0 */ }
        const dayCount = Object.keys(days).length;
        list.push({
          id: k,
          ref: String(e.ref || ""),
          nb: String(e.nb || ""),
          at: at,
          status: String(e.status || "pending"),
          tests: tests,
          days: dayCount,
          eligible: tests >= 5 && dayCount >= 3
        });
      }
      return res.status(200).json({ success: true, list: list });
    } catch (e) {
      console.error("reflist crash:", e);
      return res.status(502).json({ success: false, message: "ਲੋਡ ਨਹੀਂ ਹੋਇਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }
  }

  /* ═══════════ 💰 REFERRAL: refact (admin approve/reject — approve = 3 din FULL pass) ═══════════ */
  if (body.fn === "refact") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email || String(payload.email).trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase())
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ admin।" });
    const id = String(body.id || "");
    const action = String(body.action || "");
    if (!id || (action !== "approve" && action !== "reject"))
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ request।" });
    try {
      const rec = await fbGet("referrals/" + encodeURIComponent(id));
      if (!rec || typeof rec !== "object")
        return res.status(400).json({ success: false, message: "ਇਹ referral ਨਹੀਂ ਮਿਲਿਆ।" });
      if (action === "reject") {
        await fetch(FIREBASE_DB_URL + "/referrals/" + encodeURIComponent(id) + ".json?auth=" + encodeURIComponent(FIREBASE_DB_SECRET), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: rec.ref, nb: rec.nb, at: rec.at || Date.now(), status: "rejected" })
        });
        return res.status(200).json({ success: true, message: "Reject ਕਰ ਦਿੱਤਾ।" });
      }
      if (rec.status === "approved")
        return res.status(400).json({ success: false, message: "ਇਹ ਪਹਿਲਾਂ ਹੀ approved ਹੈ।" });
      const all = (await fbGet("referrals")) || {};
      let refApproved = 0;
      Object.keys(all).forEach(function (k) {
        const e = all[k] || {};
        if (e.ref === rec.ref && e.status === "approved") refApproved++;
      });
      if (refApproved >= 2)
        return res.status(400).json({ success: false, message: "ਇਸ student ਦੀ reward limit (2) ਪੂਰੀ ਹੈ।" });
      /* 🎁 3 din FULL pass — sare 8 categories */
      const REWARD_DAYS = 3;
      const cats = ["police", "patwari", "clerk", "ssc", "ptet1", "ptet2", "banking", "current"];
      let granted = 0;
      for (let ci = 0; ci < cats.length; ci++) {
        let cur = 0;
        try { cur = await fbGet("users/" + encodeURIComponent(rec.ref) + "/passes/" + cats[ci]); } catch (e2) {}
        const base = Math.max(Date.now(), (typeof cur === "number") ? cur : 0);
        await fetch(FIREBASE_DB_URL + "/users/" + encodeURIComponent(rec.ref) + "/passes/" + cats[ci] + ".json?auth=" + encodeURIComponent(FIREBASE_DB_SECRET), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(base + REWARD_DAYS * 24 * 60 * 60 * 1000)
        });
        granted++;
      }
      await fetch(FIREBASE_DB_URL + "/referrals/" + encodeURIComponent(id) + ".json?auth=" + encodeURIComponent(FIREBASE_DB_SECRET), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: rec.ref, nb: rec.nb, at: rec.at || Date.now(), status: "approved", rewAt: Date.now() })
      });
      return res.status(200).json({ success: true, granted: granted, message: "✅ 3 ਦਿਨ ਦਾ full pass ਮਿਲ ਗਿਆ (" + granted + " categories)।" });
    } catch (e) {
      console.error("refact crash:", e);
      return res.status(502).json({ success: false, message: "ਨਹੀਂ ਹੋ ਸਕਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }
  }

  /* ═══════════ 🎯 AI STUDY PLAN BRANCH — { fn: "plan", idToken }
     (userAttempts de hisaab nal 7-din da personal plan) ═══════════ */
  if (body.fn === "plan") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const mPl = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!mPl)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵਰਤ ਸਕਦੇ ਹਨ।" });
    if (!GEMINI_API_KEY)
      return res.status(500).json({ success: false, message: "AI service ਹਾਲੇ off ਹੈ — admin ਨੂੰ ਦੱਸੋ।" });
    const phone = mPl[1];
    try {
      let n = 0, sum = 0;
      const subj = {};
      try {
        const att = (await fbGet("userAttempts/" + encodeURIComponent(phone))) || {};
        Object.keys(att).forEach(function (k) {
          const a = att[k];
          if (!a) return;
          const tt = Number(a.total) || 0, sc = Number(a.score) || 0;
          const pct = tt > 0 ? Math.round((sc * 100) / tt) : 0;
          n++; sum += pct;
          const t = (String(a.title || "Test").split(" ")[0] || "Test").slice(0, 24);
          if (!subj[t]) subj[t] = { n: 0, sum: 0 };
          subj[t].n++; subj[t].sum += pct;
        });
      } catch (e2) {}
      if (n < 3)
        return res.status(400).json({ success: false, message: "ਪਹਿਲਾਂ 3+ ਟੈਸਟ ਦਿਓ — ਫੇਰ ਮੈਂ ਪੱਕਾ ਪਲਾਨ ਬਣਾ ਸਕਾਂਗਾ 📝" });
      const parts = [];
      Object.keys(subj).forEach(function (t) {
        parts.push(t + " (ਔਸਤ " + Math.round(subj[t].sum / subj[t].n) + "%)");
      });
      const prompt = "ਮੇਰੀ ਟੈਸਟ performance: " + parts.join(", ") + "। ਕੁੱਲ ਔਸਤ " + Math.round(sum / n) + "%। ਮੇਰਾ 7-ਦਿਨਾਂ ਦਾ ਪੱਕਾ study plan ਲਿਖੋ — ਹਰ ਦਿਨ ਇੱਕ ਲਾਈਨ ('ਦਿਨ 1:' ਤੋਂ ਸ਼ੁਰੂ), ਹਰ ਲਾਈਨ ਵਿੱਚ ਕੀ ਪੜ੍ਹਨਾ ਹੈ + ਕਿੰਨੇ ਸਵਾਲ/ਟੈਸਟ ਕਰਨੇ ਹਨ।";

      let text = "";
      let lastErr = "";
      for (let i = 0; i < GEMINI_MODELS.length && !text; i++) {
        const model = GEMINI_MODELS[i];
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: "ਤੂੰ ਪੰਜਾਬ competitive exams (Police, Clerk, Patwari, SSC) ਦਾ ਤਜਰਬੇਕਾਰ study planner ਹੈਂ। ਤੂੰ ਸਿਰਫ਼ 7-ਦਿਨਾਂ ਦਾ ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ) ਪਲਾਨ ਲਿਖਦਾ ਹੈਂ — ਕਮਜ਼ੋਰ ਵਿਸ਼ਿਆਂ 'ਤੇ ਵੱਧ ਫ਼ੋਕਸ। ਕੋਈ ਜਾਣ-ਪਛਾਣ, ਧੰਨਵਾਦ, ਸਵਾਲ ਜਾਂ ਵਾਧੂ ਗੱਲ ਬਿਲਕੁੱਲ ਨਹੀਂ — ਸਿੱਧਾ 'ਦਿਨ 1:' ਤੋਂ ਪਲਾਨ ਸ਼ੁਰੂ।" }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 2048, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } }
            })
          }
        );
        const d = await r.json().catch(() => null);
        text = "";
        if (d && d.candidates && d.candidates[0] && d.candidates[0].content && Array.isArray(d.candidates[0].content.parts)) {
          d.candidates[0].content.parts.forEach(function (p) {
            if (p && typeof p.text === "string" && !p.thought) text += p.text;
          });
        }
        if (!text) {
          lastErr = d && d.error ? String(d.error.status || "") + " " + String(d.error.message || "") : "no response";
          console.error("AI plan fail (" + model + "): " + lastErr.slice(0, 250));
          if (/API_KEY_INVALID|PERMISSION_DENIED/i.test(lastErr)) break;
        }
      }
      if (!text) {
        const quotaHit = /quota|429|RESOURCE_EXHAUSTED/i.test(lastErr);
        return res.status(quotaHit ? 429 : 502).json({
          success: false,
          message: quotaHit ? "ਅੱਜ ਦੀ AI limit ਪੂਰੀ — ਕੱਲ੍ਹ ਫੇਰ ਜੀ।" : "ਪਲਾਨ ਨਹੀਂ ਬਣ ਸਕਿਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
        });
      }
      return res.status(200).json({ success: true, plan: String(text).trim().slice(0, 1600) });
    } catch (e) {
      console.error("AI plan branch crash:", e);
      return res.status(502).json({ success: false, message: "AI service ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ — ਥੋੜ੍ਹੀ ਉਡੀਕ ਪਿੱਛੋਂ ਦੁਬਾਰਾ।" });
    }
  }

  /* ═══════════ 🏆 LEADERBOARD BRANCH — { fn: "leaderboard", idToken }
     (hafte de top-10 — quizResults ton, server-side read, rules bypass) ═══════════ */
  if (body.fn === "leaderboard") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const isAdmLb = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const mLb = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!mLb && !isAdmLb)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵੇਖ ਸਕਦੇ ਹਨ।" });
    try {
      const all = await fbGet("quizResults");
      if (!all || typeof all !== "object")
        return res.status(200).json({ success: true, list: [] });
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const best = {};
      Object.keys(all).forEach(function (k) {
        const e = all[k];
        if (!e || typeof e !== "object") return;
        const at = Number(e.at) || 0;
        if (at < weekAgo) return;
        const sc = Number(e.score) || 0, tt = Number(e.total) || 0;
        if (tt <= 0) return;
        const pct = Math.round((sc * 100) / tt);
        const nm = String(e.name || "Student").slice(0, 40).trim() || "Student";
        if (!best[nm] || pct > best[nm].pct) best[nm] = { pct: pct, score: sc, total: tt, at: at };
      });
      const list = Object.keys(best).map(function (nm) {
        return { name: nm, pct: best[nm].pct, score: best[nm].score, total: best[nm].total, at: best[nm].at };
      }).sort(function (a, b) { return b.pct - a.pct || a.at - b.at; }).slice(0, 10);
      return res.status(200).json({ success: true, list: list });
    } catch (e) {
      console.error("Leaderboard branch crash:", e);
      return res.status(502).json({ success: false, message: "Leaderboard ਲੋਡ ਨਹੀਂ ਹੋਇਆ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }
  }

  /* ═══════════ 📈 REPORT CARD BRANCH — { fn: "report", idToken }
     (apni progress — userAttempts/$phone ton server-side read) ═══════════ */
  if (body.fn === "report") {
    const payload = await verifyIdToken(String(body.idToken || ""));
    if (!payload || !payload.email)
      return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
    const isAdmRp = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const mRp = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
    if (!mRp && !isAdmRp)
      return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ ਵਿਦਿਆਰਥੀ ਵੇਖ ਸਕਦੇ ਹਨ।" });
    const phone = mRp ? mRp[1] : "";
    if (!phone)
      return res.status(200).json({ success: true, stats: null, message: "Admin ਦੀ ਆਪਣੀ report ਨਹੀਂ ਹੁੰਦੀ 🙂" });
    try {
      const att = await fbGet("userAttempts/" + encodeURIComponent(phone));
      if (!att || typeof att !== "object")
        return res.status(200).json({ success: true, stats: { attempts: 0, avg: 0, best: 0, questions: 0, recent: [] } });
      let n = 0, sumPct = 0, bestPct = 0, questions = 0;
      const rec = [];
      Object.keys(att).forEach(function (k) {
        const a = att[k];
        if (!a || typeof a !== "object") return;
        const tt = Number(a.total) || 0, sc = Number(a.score) || 0;
        const pct = Number(a.percentage) || (tt > 0 ? Math.round((sc * 100) / tt) : 0);
        n++; sumPct += pct;
        if (pct > bestPct) bestPct = pct;
        questions += tt;
        rec.push({ title: String(a.title || k).slice(0, 80), score: sc, total: tt, pct: pct, at: Number(a.at) || 0 });
      });
      rec.sort(function (x, y) { return y.at - x.at; });
      return res.status(200).json({
        success: true,
        stats: {
          attempts: n,
          avg: n ? Math.round(sumPct / n) : 0,
          best: bestPct,
          questions: questions,
          recent: rec.slice(0, 5)
        }
      });
    } catch (e) {
      console.error("Report branch crash:", e);
      return res.status(502).json({ success: false, message: "Report ਲੋਡ ਨਹੀਂ ਹੋਈ — ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }
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
      /* 1) Login verify → phone (sirf vidiarathi + 👑 admin) */
      const payload = await verifyIdToken(String(body.idToken || ""));
      if (!payload || !payload.email)
        return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
      const isAdmin = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const m = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
      if (!m && !isAdmin)
        return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ vidiarathi notes padh sakde han।" });
      const phone = m ? m[1] : "admin";

      /* 2) Pass check — server-side (👑 admin = hamesha pass, sab unlocked) */
      let hasPass = isAdmin;
      if (!isAdmin) {
        const expiry = await fbGet(`users/${encodeURIComponent(phone)}/passes/${passKey}`);
        hasPass = (typeof expiry === "number") && expiry > Date.now();
      }

      /* 3) Notes list lao */
      const vault = (await fbGet(`bookVault/${vaultKey}`)) || {};
      let notes = Object.keys(vault).map(function (id) {
        const n = vault[id] || {};
        return { id: id, t: n.t || "Untitled", k: n.k || "pdf", u: n.u || "", c: n.c || "", d: n.d || "", at: n.at || 0, o: (typeof n.o === "number") ? n.o : null };
      });
      /* 🔢 SORT: admin di sequence (o) pehle.
         (o set nahi = sab ton hetha — nava note list de ANT vich auge,
         admin di set kiti sequence nahi ttrdi) */
      notes.sort(function (a, b) {
        const oa = (a.o === null) ? 9e12 : a.o;
        const ob = (b.o === null) ? 9e12 : b.o;
        if (oa !== ob) return oa - ob;
        return (b.at || 0) - (a.at || 0);
      });

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

  /* ═══════════ 📎 NOTES FILE BRANCH (direct-upload PDF) ═══════════
     { fn: "file", idToken, pass, vault, id } → { data: base64 }
     Lock: sirf VALID pass vale student (teaser mode vich
     file bilkul downloadable nahi) + note da u "db:{fileId}" hona zaroori। */
  if (body.fn === "file") {
    const passKey = String(body.pass || "").trim();
    const vaultKey = String(body.vault || "").trim();
    const noteId = String(body.id || "").trim();
    if (!NOTE_PASS_KEYS.includes(passKey))
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ subject।" });
    if (!NOTE_VAULT_KEYS.includes(vaultKey))
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ vault।" });
    if (vaultKey !== passKey && vaultKey.indexOf(passKey + "_") !== 0)
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ subject combination।" });
    if (!noteId)
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ note।" });

    try {
      /* 1) Login verify → phone (sirf vidiarathi + 👑 admin) */
      const payload = await verifyIdToken(String(body.idToken || ""));
      if (!payload || !payload.email)
        return res.status(401).json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — page refresh ਕਰੋ।" });
      const isAdmin = String(payload.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const m = String(payload.email).match(/^(\d{10})@amanstudypoint\.student$/);
      if (!m && !isAdmin)
        return res.status(401).json({ success: false, message: "ਸਿਰਫ਼ vidiarathi notes padh sakde han।" });
      const phone = m ? m[1] : "admin";

      /* 2) VALID pass zaroori — bina pass file koi nahi khol sakda (👑 admin chhadd) */
      if (!isAdmin) {
        const expiry = await fbGet("users/" + encodeURIComponent(phone) + "/passes/" + passKey);
        if (!((typeof expiry === "number") && expiry > Date.now()))
          return res.status(403).json({ success: false, passRequired: true, message: "ਪਹਿਲਾਂ pass ਲਵੋ।" });
      }

      /* 3) note kholo — u = "db:{fileId}" hona zaroori */
      const note = await fbGet("bookVault/" + vaultKey + "/" + encodeURIComponent(noteId));
      if (!note || typeof note !== "object")
        return res.status(404).json({ success: false, message: "Note ਨਹੀਂ ਮਿਲਿਆ।" });
      const u = String(note.u || "");
      if (u.indexOf("db:") !== 0)
        return res.status(400).json({ success: false, message: "ਇਹ note direct file ਨਹੀਂ ਹੈ।" });

      /* 4) PDF data lao (bookVault/__files/{fileId}) */
      const data = await fbGet("bookVault/__files/" + encodeURIComponent(u.slice(3)));
      if (typeof data !== "string" || !data)
        return res.status(404).json({ success: false, message: "PDF ਨਹੀਂ ਮਿਲੀ।" });

      return res.status(200).json({ success: true, data: data });
    } catch (e) {
      console.error("get-file branch crash:", e);
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
