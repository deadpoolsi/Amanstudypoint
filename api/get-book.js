export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { phone, bookId } = req.body;

  if (!phone || !bookId) {
    return res.status(400).json({ success: false, message: "Missing phone or bookId" });
  }

  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  try {
    // 1. ਚੈੱਕ ਕਰੋ ਕਿ ਯੂਜ਼ਰ ਨੇ ਇਹ ਕਿਤਾਬ ਖਰੀਦੀ ਹੈ ਜਾਂ ਨਹੀਂ
    const checkRes = await fetch(`${FIREBASE_DB_URL}/users/${phone}/books/${bookId}.json${DB_SECRET}`);
    const isPurchased = await checkRes.json();

    if (!isPurchased) {
      return res.status(403).json({ success: false, message: "🔒 ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਇਹ ਕਿਤਾਬ ਖਰੀਦੋ ਜੀ!" });
    }

    // 2. ਸਿਰਫ਼ ਵੈਰੀਫਾਈ ਹੋਣ 'ਤੇ ਅਸਲ PDF ਲਿੰਕ ਸਰਵਰ ਵਾਲਟ ਵਿੱਚੋਂ ਕੱਢੋ
    const vaultRes = await fetch(`${FIREBASE_DB_URL}/bookVault/${bookId}.json${DB_SECRET}`);
    const bookData = await vaultRes.json();

    if (!bookData || !bookData.pdfUrl) {
      return res.status(404).json({ success: false, message: "ਕਿਤਾਬ ਦੀ PDF ਨਹੀਂ ਮਿਲੀ!" });
    }

    return res.status(200).json({
      success: true,
      url: bookData.pdfUrl
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + err.message });
  }
}
