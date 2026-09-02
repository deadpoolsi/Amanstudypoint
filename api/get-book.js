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

  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY; // Vercel Environment Variables ਵਿੱਚ ਸੈੱਟ ਕਰੋ
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

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
    // ਫ਼ੋਨ ਨੰਬਰ ਈਮੇਲ ਵਿੱਚੋਂ ਕੱਢੋ (ਜਿਵੇਂ 9876543210@amanstudypoint.student)
    const phone = authUser.email ? authUser.email.split("@")[0] : null;

    if (!phone) {
      return res.status(400).json({ success: false, message: "ਸਹੀ ਵਿਦਿਆਰਥੀ ਅਕਾਊਂਟ ਨਹੀਂ ਮਿਲਿਆ" });
    }

    // 2. ਚੈੱਕ ਕਰੋ ਕਿ ਕੀ ਇਸ ਵਿਦਿਆਰਥੀ ਕੋਲ ਕਿਤਾਬ ਦਾ ਅਧਿਕਾਰ ਹੈ
    const purchaseRes = await fetch(`${FIREBASE_DB_URL}/users/${phone}/books/${bookId}.json${DB_SECRET}`);
    const isPurchased = await purchaseRes.json();

    if (!isPurchased) {
      return res.status(403).json({ success: false, message: "🔒 ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਇਹ ਕਿਤਾਬ ਖਰੀਦੋ" });
    }

    // 3. ਸਰਵਰ ਵਾਲਟ ਵਿੱਚੋਂ PDF ਦਾ ਲਿੰਕ ਦਿਓ
    const vaultRes = await fetch(`${FIREBASE_DB_URL}/bookVault/${bookId}.json${DB_SECRET}`);
    const bookData = await vaultRes.json();

    if (!bookData || !bookData.pdfUrl) {
      return res.status(404).json({ success: false, message: "ਕਿਤਾਬ ਦੀ ਫਾਈਲ ਨਹੀਂ ਮਿਲੀ" });
    }

    return res.status(200).json({
      success: true,
      pdfUrl: bookData.pdfUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + err.message });
  }
}
