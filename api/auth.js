export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { action, phone, password, name } = req.body;
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  if (!phone || !password) {
    return res.status(400).json({ success: false, message: "ਫ਼ੋਨ ਨੰਬਰ ਅਤੇ ਪਾਸਵਰਡ ਜ਼ਰੂਰੀ ਹਨ।" });
  }

  const cleanPhone = String(phone).trim();

  try {
    const accRes = await fetch(`${FIREBASE_DB_URL}/accounts/${cleanPhone}.json${DB_SECRET}`);
    const existingAccount = await accRes.json();

    // 1. ਰਜਿਸਟ੍ਰੇਸ਼ਨ (Signup)
    if (action === "register") {
      if (existingAccount) {
        return res.status(400).json({ success: false, message: "ਇਹ ਫ਼ੋਨ ਨੰਬਰ ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰਡ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ Login ਕਰੋ।" });
      }

      const newUserData = {
        name: name || "Student",
        phone: cleanPhone,
        password: password,
        createdAt: new Date().toISOString()
      };

      // accounts ਵਿੱਚ ਸੇਵ ਕਰੋ
      await fetch(`${FIREBASE_DB_URL}/accounts/${cleanPhone}.json${DB_SECRET}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData)
      });

      // users ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ
      await fetch(`${FIREBASE_DB_URL}/users/${cleanPhone}.json${DB_SECRET}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Student", phone: cleanPhone })
      });

      return res.status(200).json({ success: true, message: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਫਲ ਰਹੀ!", user: { name: newUserData.name, phone: cleanPhone } });
    }

    // 2. ਲੌਗਇਨ (Login)
    if (action === "login") {
      if (!existingAccount) {
        return res.status(404).json({ success: false, message: "ਅਕਾਊਂਟ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਰਜਿਸਟਰ ਕਰੋ।" });
      }

      if (String(existingAccount.password) !== String(password)) {
        return res.status(401).json({ success: false, message: "ਗ਼ਲਤ ਪਾਸਵਰਡ! ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
      }

      return res.status(200).json({
        success: true,
        message: "Login ਸਫਲ ਰਿਹਾ!",
        user: { name: existingAccount.name || "Student", phone: cleanPhone }
      });
    }

    return res.status(400).json({ success: false, message: "Invalid action" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
