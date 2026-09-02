export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { name, phone, email, authType } = req.body;

  // ਜ਼ਰੂਰੀ ਜਾਣਕਾਰੀ ਵੈਰੀਫਾਈ ਕਰੋ
  if (!name || (!phone && !email)) {
    return res.status(400).json({ success: false, message: "Missing student data" });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8933476636:AAGRueUzS8oG-wHCPEhKLivcq1gyUe3plaY";
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1008408967";

  const currentTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short"
  });

  const messageText = 
`🔔 <b>ਨਵਾਂ ਵਿਦਿਆਰਥੀ ਜੁੜਿਆ!</b>

👤 <b>ਨਾਮ:</b> ${escapeHtml(name)}
📱 <b>ਫ਼ੋਨ/ਆਈਡੀ:</b> ${escapeHtml(phone || "N/A")}
📧 <b>ਈਮੇਲ:</b> ${escapeHtml(email || "N/A")}
🔐 <b>ਲਾਗਇਨ ਮੋਡ:</b> ${escapeHtml(authType || "Regular")}
🕒 <b>ਸਮਾਂ:</b> ${currentTime}

🚀 <i>Aman Study Point Portal</i>`;

  try {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: "HTML"
      })
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
