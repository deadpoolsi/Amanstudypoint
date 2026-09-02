export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ success: false, message: "ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ ਸਵਾਲ ਲਿਖੋ।" });
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "⚠️ GEMINI_API_KEY ਮੌਜੂਦ ਨਹੀਂ ਹੈ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।
ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਦਿਓ।`;

  // 1. ਸਭ ਤੋਂ ਪਹਿਲਾਂ Google Interactions API ਰਾਹੀਂ ਕਾਲ (ਜੋ Google ਨੇ ਮੰਗਿਆ ਹੈ)
  try {
    const interRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}`
      })
    });

    const interData = await interRes.json();
    if (interRes.ok) {
      const ans = interData.output || interData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (ans) return res.status(200).json({ success: true, answer: ans });
    }
  } catch (e) {}

  // 2. ਦੂਜੀ ਕੋਸ਼ਿਸ਼: gemini-3.6-flash (ਜੋ ਮੈਸੇਜ ਵਿੱਚ ਲਿਖਿਆ ਹੈ)
  try {
    const flashRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}` }] }]
      })
    });

    const flashData = await flashRes.json();
    const ans = flashData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (flashRes.ok && ans) {
      return res.status(200).json({ success: true, answer: ans });
    }
  } catch (e) {}

  // 3. ਤੀਜੀ ਕੋਸ਼ਿਸ਼: gemini-pro (ਕਲਾਸਿਕ ਬੈਕਅੱਪ)
  try {
    const proRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}` }] }]
      })
    });

    const proData = await proRes.json();
    const ans = proData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (proRes.ok && ans) {
      return res.status(200).json({ success: true, answer: ans });
    }
  } catch (e) {}

  return res.status(500).json({
    success: false,
    message: "ਸਰਵਰ ਕਨੈਕਟ ਨਹੀਂ ਹੋ ਸਕਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  });
}
