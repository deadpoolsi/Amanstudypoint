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

// ਪਲਾਨ ਦੇ ਦਿਨ
const DURATION_DAYS = {
  week: 7,
  month: 30,
  sixMonths: 180,
  year: 365
};

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
    amount,
    couponCode,
    couponType,
    category
  } = req.body;

  // 1. ਸਾਰੇ ਪੈਰਾਮੀਟਰ ਲਾਜ਼ਮੀ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !phone || !bookId) {
    return res.status(400).json({ success: false, message: "ਅਧੂਰੀ ਜਾਣਕਾਰੀ (Missing required payment tokens)" });
  }

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  if (!RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error: Key Secret missing" });
  }

  // 2. ਕ੍ਰਿਪਟੋਗ੍ਰਾਫਿਕ ਸਿਗਨੇਚਰ ਵੈਰੀਫਿਕੇਸ਼ਨ
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
    // 3. ਜਾਂਚ ਕਰੋ ਕਿ ਇਹ ਟੈਸਟ ਪਾਸ ਹੈ ਜਾਂ ਕਿਤਾਬ
    if (bookId.startsWith("pass_")) {
      // ਫਾਰਮੈਟ: pass_{category}_{duration} (ਉਦਾਹਰਣ: pass_police_month)
      const parts = bookId.split("_");
      const cat = parts[1] || "police";
      const planType = parts[2] || "month";
      const days = DURATION_DAYS[planType] || 30;

      const expiryTimestamp = Date.now() + (days * 24 * 60 * 60 * 1000);

      // ਯੂਜ਼ਰ ਦੇ ਖਾਤੇ ਵਿੱਚ ਪਾਸ ਦੀ ਐਕਸਪਾਇਰੀ ਡੇਟ ਸੇਵ ਕਰੋ
      await fetch(`${FIREBASE_DB_URL}/users/${phone}/passes/${cat}.json${DB_SECRET}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expiryTimestamp)
      });
    } else if (bookId === "combo") {
      // ਕੰਬੋ ਪੈਕ ਅਨਲੌਕ ਕਰੋ
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
      // ਸਿੰਗਲ ਕਿਤਾਬ ਅਨਲੌਕ ਕਰੋ
      await fetch(`${FIREBASE_DB_URL}/users/${phone}/books/${bookId}.json${DB_SECRET}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(true)
      });
    }

    // 4. ਕੂਪਨ ਵਰਤੋਂ ਕਾਊਂਟਰ ਅੱਪਡੇਟ ਕਰੋ (usedCount + 1)
    if (couponCode && couponCode.trim() !== "") {
      try {
        let couponPath = "";
        if (couponType === "category" && category) {
          couponPath = `siteSettings/passPricing/${category}/coupon/usedCount`;
        } else if (bookId.startsWith("pass_")) {
          const cat = bookId.split("_")[1] || "police";
          couponPath = `siteSettings/passPricing/${cat}/coupon/usedCount`;
        } else {
          couponPath = `siteSettings/coupon/usedCount`;
        }

        const getRes = await fetch(`${FIREBASE_DB_URL}/${couponPath}.json${DB_SECRET}`);
        const curCount = (await getRes.json()) || 0;
        await fetch(`${FIREBASE_DB_URL}/${couponPath}.json${DB_SECRET}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(curCount + 1)
        });
      } catch (cErr) {
        console.warn("Coupon usage increment warning:", cErr);
      }
    }

    // 5. ਪੇਮੈਂਟ ਆਡਿਟ ਲੌਗ ਦਰਜ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/payments/${razorpay_payment_id}.json${DB_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        name: name || "Student",
        itemPurchased: bookId,
        amount: amount || 0,
        couponUsed: couponCode || "None",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        timestamp: new Date().toISOString()
      })
    });

    return res.status(200).json({ success: true, message: "ਭੁਗਤਾਨ ਸਫਲ ਰਿਹਾ ਅਤੇ ਆਈਟਮ ਅਨਲੌਕ ਹੋ ਗਈ!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "ਡਾਟਾਬੇਸ ਅੱਪਡੇਟ ਅਸਫਲ: " + error.message });
  }
}
