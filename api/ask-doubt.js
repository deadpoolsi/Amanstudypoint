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
ਸਿਰਫ਼ ਮੁਕਾਬਲੇ ਦੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ (Maths, GK, Reasoning, Punjabi, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।
ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਸਪਸ਼ਟ ਦਿਓ।`;

  const fullPrompt = `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}`;

  // 1. Google ਦਾ ਨਵਾਂ Interactions API (gemini-2.5-flash ਮਾਡਲ ਨਾਲ)
  try {
    const interRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        input: fullPrompt
      })
    });

    const interData = await interRes.json();
    const outText = interData.output || interData.text || interData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (interRes.ok && outText) {
      return res.status(200).json({ success: true, answer: outText });
    }
  } catch (e) {}

  // 2. generateContent Fallback (gemini-2.5-pro ਅਤੇ gemini-2.5-flash)
  const fallbackModels = ["gemini-2.5-pro", "gemini-2.5-flash"];
  for (const m of fallbackModels) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });

      const data = await resp.json();
      const ans = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resp.ok && ans) {
        return res.status(200).json({ success: true, answer: ans });
      }
    } catch (err) {}
  }

  return res.status(500).json({
    success: false,
    message: "ਸਰਵਰ ਜਵਾਬ ਤਿਆਰ ਨਹੀਂ ਕਰ ਸਕਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  });
}
