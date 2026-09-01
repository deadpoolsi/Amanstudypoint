export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { bookId, phone } = req.body;
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  if (!bookId || !phone) {
    return res.status(400).json({ success: false, message: "Book ID and Phone are required" });
  }

  try {
    // 1. ਸਰਵਰ 'ਤੇ ਚੈੱਕ ਕਰੋ ਕਿ ਕੀ ਕਿਤਾਬ ਅਨਲੌਕ ਹੈ
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${phone}/books.json${DB_SECRET}`);
    const userBooks = await userRes.json() || {};

    const isUnlocked = userBooks[bookId] === true || userBooks["combo"] === true || userBooks["all_combo"] === true;

    if (!isUnlocked) {
      return res.status(403).json({ success: false, message: "ਕਿਤਾਬ ਲਾਕ ਹੈ। ਪਹਿਲਾਂ ਖਰੀਦੋ।" });
    }

    // 2. ਲਾਕ ਵਾਲਟ ਵਿੱਚੋਂ ਅਸਲ PDF ਲਿੰਕ ਸੁਰੱਖਿਅਤ ਕੱਢੋ
    const vaultRes = await fetch(`${FIREBASE_DB_URL}/bookVault/${bookId}.json${DB_SECRET}`);
    const pdfUrl = await vaultRes.json();

    if (!pdfUrl) {
      return res.status(404).json({ success: false, message: "PDF ਲਿੰਕ ਅੱਪਲੋਡ ਨਹੀਂ ਹੈ।" });
    }

    return res.status(200).json({ success: true, pdfUrl });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
