export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ (Unauthorized)" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ success: false, message: "ਕਿਤਾਬ ਦੀ ਆਈਡੀ ਗੁੰਮ ਹੈ" });
  }

  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  const DB_SECRET = process.env.FIREBASE_DB_SECRET;
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";

  try {
    // 1. Firebase Identity Toolkit ਰਾਹੀਂ Token ਵੈਰੀਫਾਈ ਕਰੋ
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return res.status(401).json({ success: false, message: "ਅਵੈਧ ਜਾਂ ਐਕਸਪਾਇਰ ਟੋਕਨ" });
    }

    const authUser = verifyData.users[0];
    const email = authUser.email || "";
    const phone = email.includes("@") ? email.split("@")[0] : null;

    if (!phone) {
      return res.status(400).json({ success: false, message: "ਸਹੀ ਵਿਦਿਆਰਥੀ ਅਕਾਊਂਟ ਨਹੀਂ ਮਿਲਿਆ" });
    }

    const authParam = DB_SECRET ? `?auth=${DB_SECRET}` : "";

    // 2. ਚੈੱਕ ਕਰੋ ਕਿ ਕੀ ਯੂਜ਼ਰ ਕੋਲ ਕਿਤਾਬ ਹੈ
    const purchaseRes = await fetch(`${FIREBASE_DB_URL}/users/${phone}/books/${bookId}.json${authParam}`);
    const purchaseText = await purchaseRes.text();

    let isPurchased = false;
    try {
      isPurchased = JSON.parse(purchaseText);
    } catch (e) {
      return res.status(500).json({ success: false, message: "ਡਾਟਾਬੇਸ ਰਿਸਪਾਂਸ ਅਵੈਧ ਹੈ: " + purchaseText });
    }

    if (!isPurchased) {
      return res.status(403).json({ success: false, message: "🔒 ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਇਹ ਕਿਤਾਬ ਖਰੀਦੋ" });
    }

    // 3. Vault ਵਿੱਚੋਂ PDF ਦਾ ਲਿੰਕ ਲਵੋ
    const vaultRes = await fetch(`${FIREBASE_DB_URL}/bookVault/${bookId}.json${authParam}`);
    const vaultText = await vaultRes.text();
    
    let bookData = null;
    try {
      bookData = JSON.parse(vaultText);
    } catch (e) {
      return res.status(500).json({ success: false, message: "ਵਾਲਟ ਰਿਸਪਾਂਸ ਅਵੈਧ ਹੈ: " + vaultText });
    }

    const pdfUrl = bookData?.pdfUrl || bookData?.url || (typeof bookData === 'string' ? bookData : null);

    if (!pdfUrl) {
      return res.status(404).json({ success: false, message: "ਕਿਤਾਬ ਦੀ PDF ਵਾਲਟ ਵਿੱਚ ਨਹੀਂ ਮਿਲੀ" });
    }

    return res.status(200).json({
      success: true,
      pdfUrl: pdfUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + err.message });
  }
}
