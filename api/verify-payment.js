export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  const { razorpay_payment_id, bookId, phone, name, amount } = req.body;
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";

  if (!razorpay_payment_id || !bookId || !phone) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const updatePayload = {};

    if (bookId === "combo" || bookId === "all_combo") {
      ["punjabi", "gk", "maths", "reasoning", "history", "science", "constitution", "computer", "combo"].forEach(id => {
        updatePayload[id] = true;
      });
    } else {
      updatePayload[bookId] = true;
    }

    // Firebase ਡਾਟਾਬੇਸ ਵਿੱਚ ਕਿਤਾਬ ਅਨਲੌਕ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/users/${phone}/books.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    // ਪੇਮੈਂਟ ਰਿਕਾਰਡ ਦਰਜ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/payments/${razorpay_payment_id}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: razorpay_payment_id,
        phone,
        name: name || "Student",
        bookId,
        amount,
        verifiedBy: "Vercel_Server",
        date: new Date().toLocaleString(),
        status: "SUCCESS"
      })
    });

    return res.status(200).json({ success: true, message: "Payment verified and book unlocked!" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
