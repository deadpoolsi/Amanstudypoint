export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { razorpay_payment_id, bookId, phone, name, amount } = req.body;
  const RAZORPAY_KEY_ID = "rzp_live_TVWYBLz18w4R54";
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  if (!razorpay_payment_id || !bookId || !phone || !amount) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  if (!RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error: Key Secret missing" });
  }

  try {
    // 1. Razorpay ਸਰਵਰ ਤੋਂ ਪੇਮੈਂਟ ਵੈਰੀਫਿਕੇਸ਼ਨ
    const authHeader = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: authHeader }
    });

    if (!rzpRes.ok) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay Payment ID" });
    }

    const paymentData = await rzpRes.json();

    if (paymentData.status !== "captured") {
      return res.status(400).json({ success: false, message: `Payment not captured. Status: ${paymentData.status}` });
    }

    const expectedAmountPaise = Math.round(Number(amount) * 100);
    if (paymentData.amount < expectedAmountPaise) {
      return res.status(400).json({ success: false, message: "Paid amount is less than required price" });
    }

    // 2. Replay Attack ਰੋਕੋ
    const checkPayment = await fetch(`${FIREBASE_DB_URL}/payments/${razorpay_payment_id}.json${DB_SECRET}`);
    const existingRecord = await checkPayment.json();
    if (existingRecord && existingRecord.status === "SUCCESS") {
      return res.status(400).json({ success: false, message: "This payment has already been processed" });
    }

    // 3. ਕਿਤਾਬ ਅਨਲੌਕ ਕਰੋ
    const updatePayload = {};
    if (bookId === "combo" || bookId === "all_combo") {
      ["punjabi", "gk", "maths", "reasoning", "history", "science", "constitution", "computer", "combo"].forEach(id => {
        updatePayload[id] = true;
      });
    } else {
      updatePayload[bookId] = true;
    }

    await fetch(`${FIREBASE_DB_URL}/users/${phone}/books.json${DB_SECRET}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    // 4. ਪੇਮੈਂਟ ਰਿਕਾਰਡ ਦਰਜ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/payments/${razorpay_payment_id}.json${DB_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: razorpay_payment_id,
        phone,
        name: name || "Student",
        bookId,
        amount: Number(amount),
        currency: paymentData.currency,
        verifiedBy: "Razorpay_Official_Server",
        date: new Date().toLocaleString(),
        status: "SUCCESS"
      })
    });

    return res.status(200).json({ success: true, message: "Payment verified successfully and book unlocked!" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
