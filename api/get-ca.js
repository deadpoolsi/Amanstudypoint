// @ts-nocheck
/* ============================================================
   Aman Study Point — Secure Current Affairs Loader (api/get-ca.js)
   ------------------------------------------------------------
   🔒 CA content PAID hai — server hi dinda hai:
   1. currentAffairs node PUBLICLY padha nahi ja sakda
      (rules vich .read: false) — sirf eh API (DB secret naal)
      content dindi hai.
   2. Demo month (demo: true) → sirf login chahida.
   3. Baaki months → users/{phone}/passes/ca server-side check
      (browser valon paywall skip karna namumkin).
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;
// Public web API key — har client page de source vich khulhi hai
const WEB_API_KEY = "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw";

const CA_PASS_CAT = "ca";
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

// Firebase idToken verify karo + email match karo
async function verifyIdentity(idToken, expectedPhone) {
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idToken })
      }
    );
    const d = await r.json();
    const email = d && d.users && d.users[0] && d.users[0].email;
    if (!email) return false;
    if (expectedPhone) {
      return email === `${expectedPhone}@amanstudypoint.student`;
    }
    return true;
  } catch (e) {
    return false;
  }
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

  try {
    const body = req.body || {};
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
    const cr = await fetch(
      `${FIREBASE_DB_URL}/currentAffairs/${encodeURIComponent(section)}/${encodeURIComponent(month)}.json?auth=${FIREBASE_DB_SECRET}`
    );
    const data = await cr.json();
    if (!data || typeof data.content !== "string" || !data.content.trim()) {
      return res
        .status(404)
        .json({ success: false, message: "ਇਹ ਮਹੀਨਾ ਹਾਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ!" });
    }

    // 1) Login (identity) hamesha verify
    const identityOk = await verifyIdentity(idToken, phone);
    if (!identityOk) {
      return res
        .status(403)
        .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਲੌਗਇਨ ਕਰੋ" });
    }

    // 2) Demo month nahi → PASS check (server-side)
    if (data.demo !== true) {
      const pr = await fetch(
        `${FIREBASE_DB_URL}/users/${encodeURIComponent(phone)}/passes/${CA_PASS_CAT}.json?auth=${FIREBASE_DB_SECRET}`
      );
      const expiry = await pr.json();
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
