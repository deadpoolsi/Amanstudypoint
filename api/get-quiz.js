// @ts-nocheck
/* ============================================================
   Aman Study Point — Secure Quiz Loader (api/get-quiz.js)
   ------------------------------------------------------------
   🔒 SECURITY FIX (answers leak):
   Pehle categoryTests + dailyQuiz nodes PUBLIC si — koi vi
   Developer Tools ya sidhe Firebase REST naal SAARE sawaal
   + JAWAB download kar sakda si (100% cheating possible si).
   Hun:
   1. Jawab (answer) server hi kadhi dinda hai — browser
      tak KADHI nahi pujarda.
   2. Paid tests layi PASS-CHECK vi server-side hai —
      browser valon paywall skip karna namumkin.
   3. Identity (login) vi server verify karda hai.
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;
// Public web API key — eh har ek client page de source vich khulhi
// hai hi (public cheez hai), is layi server vich likhna surakhit hai.
const WEB_API_KEY = "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw";

function stripAnswer(q) {
  if (!q || typeof q !== "object") return q;
  const copy = Object.assign({}, q);
  delete copy.answer;
  return copy;
}

// Firebase idToken verify karo + email match karo
async function verifyIdentity(idToken, expectedPhone) {
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idToken }),
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
    const { type, cat, id, phone, idToken } = body;

    /* ---- Mode 1: TEST LIST (sirf keys — jawab nahi) ---- */
    if (type === "list") {
      if (!cat) {
        return res.status(400).json({ success: false, message: "cat missing" });
      }
      const r = await fetch(
        `${FIREBASE_DB_URL}/categoryTests/${encodeURIComponent(cat)}.json?shallow=true&auth=${FIREBASE_DB_SECRET}`
      );
      const data = await r.json();
      const keys = data && typeof data === "object" ? Object.keys(data) : [];
      return res.status(200).json({ success: true, keys: keys });
    }

    /* ---- Mode 2: DAILY QUIZ (free content — jawab kadhe) ---- */
    if (type === "daily") {
      const r = await fetch(
        `${FIREBASE_DB_URL}/dailyQuiz.json?auth=${FIREBASE_DB_SECRET}`
      );
      const quiz = await r.json();
      const questions = Array.isArray(quiz) ? quiz.map(stripAnswer) : [];
      return res.status(200).json({ success: true, questions: questions });
    }

    /* ---- Mode 3: CATEGORY TEST (identity + pass server-side) ---- */
    if (!cat || !id) {
      return res.status(400).json({ success: false, message: "cat/id missing" });
    }

    const identityOk = await verifyIdentity(idToken, phone);
    if (!identityOk) {
      return res
        .status(403)
        .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਲੌਗਿਨ ਕਰੋ" });
    }

    // Pehla test = FREE DEMO (client de logic ate ikro order)
    const lr = await fetch(
      `${FIREBASE_DB_URL}/categoryTests/${encodeURIComponent(cat)}.json?shallow=true&auth=${FIREBASE_DB_SECRET}`
    );
    const ldata = await lr.json();
    const keys = ldata && typeof ldata === "object" ? Object.keys(ldata) : [];
    const isFreeDemo = keys.length > 0 && keys[0] === id;

    if (!isFreeDemo) {
      // 🔒 PASS CHECK — server-side (browser skip nahi kar sakda)
      if (!phone) {
        return res.status(403).json({ success: false, message: "Login chahida" });
      }
      const pr = await fetch(
        `${FIREBASE_DB_URL}/users/${encodeURIComponent(phone)}/passes/${encodeURIComponent(cat)}.json?auth=${FIREBASE_DB_SECRET}`
      );
      const expiry = await pr.json();
      if (!expiry || typeof expiry !== "number" || expiry <= Date.now()) {
        return res
          .status(403)
          .json({ success: false, message: "Pass active nahi hai — pass khareedo" });
      }
    }

    const qr = await fetch(
      `${FIREBASE_DB_URL}/categoryTests/${encodeURIComponent(cat)}/${encodeURIComponent(id)}/questions.json?auth=${FIREBASE_DB_SECRET}`
    );
    const questions = await qr.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({ success: false, message: "ਟੈਸਟ ਨਹੀਂ ਮਿਲਿਆ" });
    }

    return res
      .status(200)
      .json({ success: true, questions: questions.map(stripAnswer), isFreeDemo: isFreeDemo });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
