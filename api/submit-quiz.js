// @ts-nocheck
/* ============================================================
   Aman Study Point — Secure Daily Quiz Submit (api/submit-quiz.js)
   ------------------------------------------------------------
   🔒 SECURITY FIX (purane version de 3 masle):
   1. Koi vi bina login POST karke FAKE naam/score leaderboard
      vich likh sakda si (identity check nahi si).
   2. quizResults (public leaderboard) vich students de PHONE
      NUMBERS likhe jande san — sab nu dikhde san.
   3. dailyQuiz read hun admin-only rules nal — server secret
      nal hi parhda hai.
   Client (app.js) hun idToken vi bhejda hai — usde naal
   phone match hunda hai. Response format same hai:
   { success, score, total, percentage }
   ============================================================ */

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  "https://aman-study-point-default-rtdb.firebaseio.com";
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;
const WEB_API_KEY = "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw";

// Firebase idToken verify + email === phone@amanstudypoint.student
async function verifyIdentity(idToken, phone) {
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
    return email === `${phone}@amanstudypoint.student`;
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
    const { phone, name, userAnswers, version, idToken } = req.body || {};

    // 🔒 Identity verify — fake entries namumkin
    if (!phone || !idToken) {
      return res.status(403).json({ success: false, message: "Login required" });
    }
    const identityOk = await verifyIdentity(idToken, phone);
    if (!identityOk) {
      return res
        .status(403)
        .json({ success: false, message: "ਲੌਗਿਨ ਸੈਸ਼ਨ ਗ਼ਲਤ ਹੈ — ਦੁਬਾਰਾ ਲੌਗਿਨ ਕਰੋ" });
    }

    // Daily quiz de sawaal (server secret nal — jawab bahar nahi jande)
    const r = await fetch(`${FIREBASE_DB_URL}/dailyQuiz.json?auth=${FIREBASE_DB_SECRET}`);
    const questions = await r.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({ success: false, message: "Quiz nahi mila" });
    }

    // SERVER-SIDE SCORING
    let score = 0;
    questions.forEach((q, i) => {
      if (q && typeof q.answer === "number" && userAnswers && userAnswers[i] === q.answer) {
        score++;
      }
    });
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const ver = version || "v1";

    // 🔒 Leaderboard entry — PHONE HATA DITA (PII leak fix)
    await fetch(`${FIREBASE_DB_URL}/quizResults.json?auth=${FIREBASE_DB_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (name || "Student").toString().slice(0, 40),
        score: score,
        total: total,
        time: timeStr,
        version: ver,
      }),
    });

    // Attempt record (analytics + "already attempted" check layi)
    await fetch(
      `${FIREBASE_DB_URL}/userAttempts/${encodeURIComponent(phone)}/${encodeURIComponent(ver)}.json?auth=${FIREBASE_DB_SECRET}`,
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
