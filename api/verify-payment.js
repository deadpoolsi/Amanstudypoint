import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    phone,
    bookId
  } = req.body;

  // ਪੇਮੈਂਟ ਆਈਡੀ, ਫ਼ੋਨ ਅਤੇ ਕਿਤਾਬ ਆਈਡੀ ਲਾਜ਼ਮੀ ਹਨ
  if (!razorpay_payment_id || !phone || !bookId) {
    return res.status(400).json({ success: false, message: "ਅਧੂਰੀ ਜਾਣਕਾਰੀ (Missing payment details)" });
  }

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration missing secret" });
  }

  // 🔒 ਸਿਗਨੇਚਰ ਵੈਰੀਫਿਕੇਸ਼ਨ (ਜੇਕਰ ਆਰਡਰ ਆਈਡੀ ਅਤੇ ਸਿਗਨੇਚਰ ਮੌਜੂਦ ਹਨ)
  if (razorpay_order_id && razorpay_signature) {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "ਅਵੈਧ ਪੇਮੈਂਟ ਸਿਗਨੇਚਰ (Tampered Payment)" });
    }
  }

  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  try {
    // 1. ਕਿਤਾਬ ਅਨਲੌਕ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/users/${phone}/books/${bookId}.json${DB_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(true)
    });

    // 2. ਪੇਮੈਂਟ ਲੌਗ ਦਰਜ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/payments/${razorpay_payment_id}.json${DB_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        bookId: bookId,
        orderId: razorpay_order_id || "direct_pay",
        paymentId: razorpay_payment_id,
        timestamp: new Date().toISOString()
      })
    });

    return res.status(200).json({ success: true, message: "ਭੁਗਤਾਨ ਸਫਲ ਰਿਹਾ ਅਤੇ ਕਿਤਾਬ ਅਨਲੌਕ ਹੋ ਗਈ!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "ਡਾਟਾਬੇਸ ਅੱਪਡੇਟ ਅਸਫਲ: " + error.message });
  }
}
