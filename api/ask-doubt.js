export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 3) {
    return res.status(400).json({ success: false, message: "ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ ਸਵਾਲ ਲਿਖੋ।" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "⚠️ GEMINI_API_KEY Vercel ਵਿੱਚ configure ਨਹੀਂ ਹੈ।" });
  }

  const systemInstruction = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਤੁਹਾਡੇ ਸਖ਼ਤ ਨਿਯਮ:
1. ਤੁਹਾਨੂੰ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police Constable/SI, PSSSB Patwari, Clerk, SSC, Railway, TET) ਅਤੇ ਸਕੂਲ/ਕਾਲਜ ਦੀ ਪੜ੍ਹਾਈ (Maths, Reasoning, Punjab GK, History, Geography, Punjabi Grammar, English, Computer Awareness) ਦੇ ਸਵਾਲਾਂ ਦਾ ਹੀ ਜਵਾਬ ਦੇਣਾ ਹੈ।
2. ਜੇਕਰ ਕੋਈ ਵਿਦਿਆਰਥੀ ਪੜ੍ਹਾਈ ਤੋਂ ਬਾਹਰ ਦਾ ਸਵਾਲ ਪੁੱਛੇ (ਫ਼ਿਲਮਾਂ, ਮਨੋਰੰਜਨ, ਗਾਣੇ, ਨਿੱਜੀ ਗੱਲਾਂ, ਰਾਜਨੀਤੀ ਜਾਂ ਗੈਰ-ਵਿਦਿਅਕ ਗੱਲਾਂ), ਤਾਂ ਬਿਨਾਂ ਕੋਈ ਹੋਰ ਵੇਰਵਾ ਦਿੱਤੇ ਸਿਰਫ਼ ਇਹ ਜਵਾਬ ਦਿਓ:
"⚠️ ਮਾਫ਼ ਕਰਨਾ! ਇਹ ਸਰਚ ਬਾਰ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਅਤੇ ਸਿਲੇਬਸ ਦੀ ਪੜ੍ਹਾਈ ਲਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਵਿਸ਼ੇ ਨਾਲ ਸੰਬੰਧਿਤ ਸਵਾਲ ਹੀ ਪੁੱਛੋ।"
3. ਪੜ੍ਹਾਈ ਵਾਲੇ ਸਵਾਲਾਂ ਦਾ ਜਵਾਬ ਸਪਸ਼ਟ, ਸਰਲ ਅਤੇ ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ) ਭਾਸ਼ਾ ਵਿੱਚ ਸਟੈਪ-ਬਾਈ-ਸਟੈਪ ਜਾਂ ਪੁਆਇੰਟਾਂ ਵਿੱਚ ਦਿਓ। ਸਹੀ ਉੱਤਰ ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਰੱਖੋ।`;

  const payload = {
    contents: [{
      parts: [{ text: `${systemInstruction}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: "${query}"` }]
    }]
  };

  // ਅਧਿਕਾਰਤ ਸਥਿਰ ਮਾਡਲ ਐਂਡਪੁਆਇੰਟ
  const urls = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({
          success: true,
          answer: data.candidates[0].content.parts[0].text
        });
      }
    } catch (e) {
      // ਅਗਲੇ ਐਂਡਪੁਆਇੰਟ 'ਤੇ ਕੋਸ਼ਿਸ਼ ਕਰੋ
    }
  }

  return res.status(500).json({
    success: false,
    message: "ਸਰਵਰ ਵੱਲੋਂ ਜਵਾਬ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  });
}
