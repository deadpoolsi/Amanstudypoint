// @ts-nocheck
/* ============================================================
   Aman Study Point — Secure Test Submit (api/submit-cat-test.js)
   ------------------------------------------------------------
   🔒 SECURITY FIX (fake scores + answer leak):
   Pehle browser khud score calculate karde si (jawab client
   kol san — koi vi 100/100 fake score bana sakda si).
   Hun:
   1. Score SERVER calculate karda hai (jawab server te hi
      rehnde han).
   2. Identity verify — koi hor velle da naam/phone nal
      attempt nahi likh sakda.
   3. Attempt record vi server likhda hai — fake score
      mumkin nahi.
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;
const WEB_API_KEY = "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw";

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
    const { type, cat, id, phone, name, idToken, userAnswers } = body;

    let questions = null;
    let attemptKey = null;

    if (type === "daily") {
      /* ---- Daily demo test (tests.html ton) ---- */
      const identityOk = await verifyIdentity(idToken, phone);
      if (!identityOk) {
        return res
          .status(403)
          .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਦੁਬਾਰਾ ਲੌਗਿਨ ਕਰੋ" });
      }
      const r = await fetch(
        `${FIREBASE_DB_URL}/dailyQuiz.json?auth=${FIREBASE_DB_SECRET}`
      );
      questions = await r.json();
    } else {
      /* ---- Category test ---- */
      if (!cat || !id || !phone) {
        return res.status(400).json({ success: false, message: "cat/id/phone missing" });
      }
      const identityOk = await verifyIdentity(idToken, phone);
      if (!identityOk) {
        return res
          .status(403)
          .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਦੁਬਾਰਾ ਲੌਗਿਨ ਕਰੋ" });
      }
      const r = await fetch(
        `${FIREBASE_DB_URL}/categoryTests/${encodeURIComponent(cat)}/${encodeURIComponent(id)}/questions.json?auth=${FIREBASE_DB_SECRET}`
      );
      questions = await r.json();
      attemptKey = `${cat}__${id}`;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({ success: false, message: "ਟੈਸਟ ਨਹੀਂ ਮਿਲਿਆ" });
    }

    /* ---- SERVER-SIDE SCORING ---- */
    let score = 0;
    questions.forEach((q, i) => {
      if (q && typeof q.answer === "number" && userAnswers && userAnswers[i] === q.answer) {
        score++;
      }
    });
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    /* ---- Attempt record save (server = rules bypass, fake impossible) ---- */
    if (attemptKey && phone) {
      await fetch(
        `${FIREBASE_DB_URL}/userAttempts/${encodeURIComponent(phone)}/${encodeURIComponent(attemptKey)}.json?auth=${FIREBASE_DB_SECRET}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: score,
            total: total,
            percentage: percentage,
            at: Date.now(),
          }),
        }
      );
    }

    return res.status(200).json({
      success: true,
      score: score,
      total: total,
      percentage: percentage,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
