export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 3) {
    return res.status(400).json({ success: false, message: "ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ ਸਵਾਲ ਲਿਖੋ।" });
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "⚠️ GEMINI_API_KEY Vercel ਵਿੱਚ ਨਹੀਂ ਮਿਲੀ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਤੁਹਾਡਾ ਕੰਮ ਸਿਰਫ਼ ਮੁਕਾਬਲੇ ਦੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ (Punjab Police, Patwari, SSC, Maths, GK, Reasoning, Punjabi Grammar, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ ਹੈ।
ਜੇਕਰ ਸਵਾਲ ਪੜ੍ਹਾਈ ਤੋਂ ਬਾਹਰ ਦਾ ਹੋਵੇ ਤਾਂ ਸਿਰਫ਼ ਇਹ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਅਤੇ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਲਈ ਹੈ।"
ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਸਪਸ਼ਟ ਦਿਓ।`;

  const payload = {
    contents: [{
      parts: [{ text: `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}` }]
    }]
  };

  try {
    // 1. ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਗੂਗਲ ਤੋਂ ਪਤਾ ਕਰੋ ਕਿ ਤੁਹਾਡੀ ਕੀਅ ਲਈ ਕਿਹੜੇ ਮਾਡਲ ਉਪਲਬਧ ਹਨ
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();

    if (listData.error) {
      return res.status(400).json({ 
        success: false, 
        message: `API Key Error: ${listData.error.code} - ${listData.error.message}` 
      });
    }

    const availableModels = (listData.models || [])
      .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name);

    if (availableModels.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "ਤੁਹਾਡੀ API ਕੀਅ 'ਤੇ generateContent ਵਾਲਾ ਕੋਈ ਮਾਡਲ ਨਹੀਂ ਮਿਲਿਆ।" 
      });
    }

    // Flash ਜਾਂ Pro ਮਾਡਲ ਨੂੰ ਪਹਿਲ ਦਿਓ
    let selectedModel = availableModels.find(m => m.includes("flash")) || 
                          availableModels.find(m => m.includes("pro")) || 
                          availableModels[0];

    // 2. ਚੁਣੇ ਹੋਏ ਐਕਟਿਵ ਮਾਡਲ 'ਤੇ ਕਾਲ ਕਰੋ
    const genRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const genData = await genRes.json();

    if (genRes.ok && genData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({
        success: true,
        answer: genData.candidates[0].content.parts[0].text
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Error with model (${selectedModel}): ` + (genData.error?.message || "ਨਤੀਜਾ ਨਹੀਂ ਮਿਲਿਆ")
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error: " + err.message
    });
  }
}
