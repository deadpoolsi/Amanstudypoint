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
    return res.status(500).json({ success: false, message: "⚠️ GEMINI_API_KEY ਮੌਜੂਦ ਨਹੀਂ ਹੈ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ (Maths, GK, Reasoning, Punjabi Grammar, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।
ਗੈਰ-ਪੜ੍ਹਾਈ ਸਵਾਲਾਂ 'ਤੇ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਸਿਰਫ਼ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਲਈ ਹੈ।"
ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਦਿਓ।`;

  // 1. ਸਭ ਤੋਂ ਪਹਿਲਾਂ Google Interactions API ਰਾਹੀਂ ਕੋਸ਼ਿਸ਼ ਕਰੋ (Google ਦਾ ਨਵਾਂ ਸਿਫ਼ਾਰਿਸ਼ ਕੀਤਾ ਤਰੀਕਾ)
  try {
    const interRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}`
      })
    });

    const interData = await interRes.json();
    const interText = interData.output || interData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (interRes.ok && interText) {
      return res.status(200).json({ success: true, answer: interText });
    }
  } catch (e) {
    // ਫਾਲਬੈਕ 'ਤੇ ਜਾਓ
  }

  // 2. ਫਾਲਬੈਕ: generateContent ਲਈ ਮਾਡਲ ਲੱਭੋ (ਅਪ੍ਰਚਲਿਤ gemini-2.5 ਨੂੰ ਛੱਡ ਕੇ)
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();

    if (listData.models && Array.isArray(listData.models)) {
      // 2.5-flash ਨੂੰ ਫਿਲਟਰ ਕਰਕੇ ਬਾਹਰ ਕੱਢੋ
      const workingModels = listData.models
        .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
        .map(m => m.name.replace("models/", ""))
        .filter(name => !name.includes("2.5"));

      for (const model of workingModels) {
        try {
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}` }] }]
            })
          });

          const data = await resp.json();
          const ans = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (resp.ok && ans) {
            return res.status(200).json({ success: true, answer: ans });
          }
        } catch (err) {
          continue;
        }
      }
    }
  } catch (err) {
    //
  }

  return res.status(500).json({
    success: false,
    message: "ਸਰਵਰ ਜਵਾਬ ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਅਸਮਰੱਥ ਰਿਹਾ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  });
}
