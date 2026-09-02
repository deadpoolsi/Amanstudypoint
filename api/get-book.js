export default async function handler(req, res) {
  // ਕੇਵਲ POST ਬੇਨਤੀ ਦੀ ਆਗਿਆ ਦਿਓ
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { bookId, phone } = req.body;

  // ਪੈਰਾਮੀਟਰ ਚੈੱਕ
  if (!bookId || !phone) {
    return res.status(400).json({ success: false, message: "ਫ਼ੋਨ ਨੰਬਰ ਜਾਂ ਕਿਤਾਬ ਆਈਡੀ ਗੁੰਮ ਹੈ" });
  }

  const DB_SECRET = process.env.FIREBASE_DB_SECRET;
  const DB_BASE = "https://aman-study-point-default-rtdb.firebaseio.com";
  const authQuery = DB_SECRET ? `?auth=${DB_SECRET}` : "";

  try {
    // 1. ਜਾਂਚ ਕਰੋ ਕਿ ਵਿਦਿਆਰਥੀ ਦੇ ਖਾਤੇ ਵਿੱਚ ਕਿਤਾਬ ਖਰੀਦੀ (true) ਹੋਈ ਹੈ
    const purchaseRes = await fetch(`${DB_BASE}/users/${phone}/books/${bookId}.json${authQuery}`);
    
    if (!purchaseRes.ok) {
      return res.status(500).json({ success: false, message: "ਡਾਟਾਬੇਸ ਨਾਲ ਸੰਪਰਕ ਅਸਫਲ ਰਿਹਾ" });
    }

    const isPurchased = await purchaseRes.json();

    if (!isPurchased) {
      return res.status(403).json({ success: false, message: "🔒 ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਇਹ ਕਿਤਾਬ ਖਰੀਦੋ" });
    }

    // 2. bookVault ਵਿੱਚੋਂ PDF ਦਾ ਲਿੰਕ ਪ੍ਰਾਪਤ ਕਰੋ
    const vaultRes = await fetch(`${DB_BASE}/bookVault/${bookId}.json${authQuery}`);
    
    if (!vaultRes.ok) {
      return res.status(500).json({ success: false, message: "ਵਾਲਟ ਨਾਲ ਸੰਪਰਕ ਅਸਫਲ ਰਿਹਾ" });
    }

    const bookData = await vaultRes.json();

    // ਲਿੰਕ ਆਬਜੈਕਟ ਜਾਂ ਸਿੱਧੇ ਸਟਰਿੰਗ ਫਾਰਮੈਟ ਦੋਵਾਂ ਨੂੰ ਸੰਭਾਲੋ
    const pdfUrl = bookData?.pdfUrl || bookData?.url || (typeof bookData === "string" ? bookData : null);

    if (!pdfUrl) {
      return res.status(404).json({ success: false, message: "ਕਿਤਾਬ ਦੀ PDF ਅਜੇ bookVault ਵਿੱਚ ਅੱਪਲੋਡ ਨਹੀਂ ਕੀਤੀ ਗਈ।" });
    }

    // ਸਫਲ ਰਿਸਪਾਂਸ
    return res.status(200).json({
      success: true,
      pdfUrl: pdfUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + err.message });
  }
}
