// @ts-nocheck
/* ============================================================
   Aman Study Point — Admin Password Reset (api/admin-reset-password.js)
   ------------------------------------------------------------
   🔑 MASLA: Students de accounts "number@amanstudypoint.student"
   fake email naal bande han — Firebase da "Reset password" email
   us fake email te janda jo kade nahi pujj sakda!

   🔓 HALL: Admin (deadpool73503@gmail.com) eh API nal KISE VI
   student da password sidhe set kar sakda hai.
   Page: reset-password.html (sirf admin layi)
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

/* Service account nalo OAuth access token (verify-payment.js wala pattern) */
let cachedToken = null, cachedTokenExpiry = 0;
async function getAdminAccessToken() {
  if (!SERVICE_ACCOUNT) return null;
  if (cachedToken && Date.now() < cachedTokenExpiry - 60000) return cachedToken;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit",
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

/* Caller da idToken verify karo — sirf ADMIN hi reset kar sakda */
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
    const { adminIdToken, phone, newPassword } = req.body || {};

    /* 1. Admin check */
    if (!adminIdToken) {
      return res.status(403).json({ success: false, message: "Admin login chahida hai" });
    }
    const isAdmin = await verifyAdmin(adminIdToken);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "ਸਿਰਫ਼ Admin ਹੀ ਇਹ ਕਰ ਸਕਦਾ ਹੈ!" });
    }

    /* 2. Input validation */
    const cleanPhone = String(phone || "").trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: "ਗ਼ਲਤ mobile number (10 ਅੰਕ)" });
    }
    const newPass = String(newPassword || "");
    if (newPass.length < 6) {
      return res.status(400).json({ success: false, message: "ਨਵਾਂ password ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਵੇ" });
    }

    /* 3. Service account zaroori hai (DB_SECRET nal password reset nahi hunda) */
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: "FIREBASE_SERVICE_ACCOUNT set nahi hai — Vercel env vich service account JSON pao",
      });
    }
    const projectId = SERVICE_ACCOUNT.project_id || "aman-study-point";
    const authEmail = `${cleanPhone}@amanstudypoint.student`;

    /* 4. Student account labho (email nalo localId) */
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: [authEmail] }),
      }
    );
    const lookupData = await lookupRes.json();
    const localId =
      lookupData && lookupData.users && lookupData.users[0] && lookupData.users[0].localId;

    if (!localId) {
      return res.status(404).json({
        success: false,
        message: `ਇਸ number ਦਾ ਕੋਈ ਖਾਤਾ ਨਹੀਂ ਲੱਭਿਆ (${authEmail}) — student Register karke nava account banao`,
      });
    }

    /* 5. Nava password set karo */
    const updateRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          localId: localId,
          password: newPass,
        }),
      }
    );
    const updateData = await updateRes.json();

    if (!updateRes.ok || (updateData && updateData.error)) {
      return res.status(500).json({
        success: false,
        message: "Password update fail: " + ((updateData && updateData.error && updateData.error.message) || "unknown"),
      });
    }

    return res.status(200).json({
      success: true,
      message: `✅ Password badal dita! Student hun ${cleanPhone} + nave password naal login kar sakda hai`,
      phone: cleanPhone,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error: " + e.message });
  }
};
