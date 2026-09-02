import crypto from "crypto";

const ALL_BOOK_IDS = [
  "punjabi",
  "gk",
  "maths",
  "reasoning",
  "history",
  "science",
  "constitution",
  "computer"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    phone,
    bookId,
    name,
    amount
  } = req.body;

  // 1. ਸਾਰੇ ਪੈਰਾਮੀਟਰ ਲਾਜ਼ਮੀ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ (ਕੋਈ ਵੀ ਚੀਜ਼ ਛੱਡੀ ਨਹੀਂ ਜਾ ਸਕਦੀ)
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !phone || !bookId) {
    return res.status(400).json({ success: false, message: "ਅਧੂਰੀ ਜਾਣਕਾਰੀ (Missing required payment tokens)" });
  }

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error: Key Secret missing" });
  }

  // 2. ਕ੍ਰਿਪਟੋਗ੍ਰਾਫਿਕ ਸਿਗਨੇਚਰ ਵੈਰੀਫਿਕੇਸ਼ਨ (ਲਾਜ਼ਮੀ)
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "ਅਵੈਧ ਪੇਮੈਂਟ ਸਿਗਨੇਚਰ (Tampered / Fake Payment)" });
  }

  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  try {
    // 3. ਕਿਤਾਬ ਅਨਲੌਕ ਕਰੋ (Combo ਅਤੇ ਸਿੰਗਲ ਕਿਤਾਬ ਦੋਵਾਂ ਲਈ)
    if (bookId === "combo") {
      const updates = {};
      ALL_BOOK_IDS.forEach(id => {
        updates[id] = true;
      });
      updates["combo"] = true;

      await fetch(`${FIREBASE_DB_URL}/users/${phone}/books.json${DB_SECRET}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } else {
      await fetch(`${FIREBASE_DB_URL}/users/${phone}/books/${bookId}.json${DB_SECRET}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(true)
      });
    }

    // 4. ਪੇਮੈਂਟ ਆਡਿਟ ਲੌਗ ਦਰਜ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/payments/${razorpay_payment_id}.json${DB_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        name: name || "Student",
        bookId: bookId,
        amount: amount || 0,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        timestamp: new Date().toISOString()
      })
    });

    return res.status(200).json({ success: true, message: "ਭੁਗਤਾਨ ਸਫਲ ਰਿਹਾ ਅਤੇ ਕਿਤਾਬ ਅਨਲੌਕ ਹੋ ਗਈ!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "ਡਾਟਾਬੇਸ ਅੱਪਡੇਟ ਅਸਫਲ: " + error.message });
  }
}
