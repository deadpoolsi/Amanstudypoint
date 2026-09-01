export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { amount, bookId } = req.body;
  const RAZORPAY_KEY_ID = "rzp_live_TWdKzxxstIGLQ";
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : "";

  if (!amount || !RAZORPAY_KEY_SECRET) {
    return res.status(400).json({ success: false, message: "Amount or Server Secret missing" });
  }

  try {
    const amountInPaise = Math.round(Number(amount) * 100);
    const authHeader = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${bookId}_${Date.now()}`.slice(0, 40)
      })
    });

    const orderData = await rzpRes.json();

    if (!rzpRes.ok) {
      return res.status(rzpRes.status).json({ 
        success: false, 
        message: orderData.error?.description || "Razorpay Authentication Failed" 
      });
    }

    return res.status(200).json({
      success: true,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: RAZORPAY_KEY_ID
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
