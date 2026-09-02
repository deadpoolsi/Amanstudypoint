export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const authHeader = req.headers.authorization;
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ success: false, message: "ਕਿਤਾਬ ਆਈਡੀ ਗੁੰਮ ਹੈ" });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "🔐 ਲੌਗਇਨ ਜ਼ਰੂਰੀ ਹੈ (Authorization Token Missing)" });
  }

  const idToken = authHeader.split(" ")[1];
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyDHKhXcfzOPHBYzkn1CXuz2tw0Iix1EzMw";

  try {
    // 1. Google Identity Toolkit ਰਾਹੀਂ Firebase Auth ID Token ਵੈਰੀਫਾਈ ਕਰੋ
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );

    const verifyData = await verifyRes.json();
    if (!verifyData.users || verifyData.users.length === 0) {
      return res.status(401).json({ success: false, message: "⚠️ ਲੌਗਇਨ ਸੈਸ਼ਨ ਐਕਸਪਾਇਰ ਹੋ ਗਿਆ ਹੈ। ਦੁਬਾਰਾ ਲੌਗਇਨ ਕਰੋ।" });
    }

    const authUser = verifyData.users[0];
    const email = authUser.email || "";
    
    // ਵਿਦਿਆਰਥੀ ਦੇ ਈਮੇਲ ਵਿੱਚੋਂ ਫ਼ੋਨ ਨੰਬਰ ਕੱਢੋ (ਉਦਾਹਰਣ ਵਜੋਂ 8427263244@amanstudypoint.student)
    const phone = email.includes("@") ? email.split("@")[0] : "";

    if (!phone) {
      return res.status(403).json({ success: false, message: "ਗ਼ਲਤ ਜਾਂ ਅਧੂਰਾ ਯੂਜ਼ਰ ਪ੍ਰੋਫਾਈਲ" });
    }

    const DB_SECRET = process.env.FIREBASE_DB_SECRET;
    const DB_BASE = "https://aman-study-point-default-rtdb.firebaseio.com";
    const authQuery = DB_SECRET ? `?auth=${DB_SECRET}` : "";

    // 2. ਡਾਟਾਬੇਸ ਵਿੱਚ ਖਰੀਦ ਸਥਿਤੀ ਚੈੱਕ ਕਰੋ
    const purchaseRes = await fetch(`${DB_BASE}/users/${phone}/books/${bookId}.json${authQuery}`);
    
    if (!purchaseRes.ok) {
      return res.status(500).json({ success: false, message: "ਡਾਟਾਬੇਸ ਨਾਲ ਸੰਪਰਕ ਅਸਫਲ ਰਿਹਾ" });
    }

    const isPurchased = await purchaseRes.json();

    if (!isPurchased) {
      return res.status(403).json({ success: false, message: "🔒 ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਇਹ ਕਿਤਾਬ ਖਰੀਦੋ" });
    }

    // 3. ਵਾਲਟ ਵਿੱਚੋਂ ਕਿਤਾਬ ਦਾ ਲਿੰਕ ਪ੍ਰਾਪਤ ਕਰੋ
    const vaultRes = await fetch(`${DB_BASE}/bookVault/${bookId}.json${authQuery}`);
    
    if (!vaultRes.ok) {
      return res.status(500).json({ success: false, message: "ਵਾਲਟ ਨਾਲ ਸੰਪਰਕ ਅਸਫਲ ਰਿਹਾ" });
    }

    const bookData = await vaultRes.json();
    const pdfUrl = bookData?.pdfUrl || bookData?.url || (typeof bookData === "string" ? bookData : null);

    if (!pdfUrl) {
      return res.status(404).json({ success: false, message: "ਕਿਤਾਬ ਦੀ PDF ਅਜੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।" });
    }

    return res.status(200).json({
      success: true,
      pdfUrl: pdfUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + err.message });
  }
}
