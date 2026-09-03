export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ success: false, message: "ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ ਸਵਾਲ ਲਿਖੋ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਤੁਹਾਡੇ ਨਿਯਮ:
1. ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ (Maths, Reasoning, Punjab GK, History, Geography, Punjabi Grammar, English, Computer Awareness) ਦੇ ਸਵਾਲਾਂ ਦਾ ਹੀ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ ਹੈ।
2. ਗੈਰ-ਪੜ੍ਹਾਈ ਸਵਾਲਾਂ 'ਤੇ ਸਿਰਫ਼ ਇਹ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਬਾਰ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਅਤੇ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਲਈ ਹੈ।"
3. ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਸਪਸ਼ਟ ਦਿਓ।`;

  try {
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        model: "openai",
        seed: 42
      })
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const answer = await response.text();

    if (!answer || answer.trim().length === 0) {
      return res.status(500).json({ success: false, message: "ਜਵਾਬ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕਿਆ।" });
    }

    return res.status(200).json({ success: true, answer: answer.trim() });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + error.message
    });
  }
}
