export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ success: false, message: "ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ ਸਵਾਲ ਲਿਖੋ।" });
  }

  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "⚠️ GROQ_API_KEY Vercel ਵਿੱਚ ਨਹੀਂ ਮਿਲੀ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਤੁਹਾਡਾ ਕੰਮ ਸਿਰਫ਼ ਮੁਕਾਬਲੇ ਦੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ (Maths, GK, Reasoning, Punjabi Grammar, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ ਹੈ।
ਜੇਕਰ ਸਵਾਲ ਪੜ੍ਹਾਈ ਤੋਂ ਬਾਹਰ ਦਾ ਹੋਵੇ ਤਾਂ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਅਤੇ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਲਈ ਹੈ।"
ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਸਪਸ਼ਟ ਦਿਓ।`;

  try {
    // 1. Groq ਤੋਂ ਤੁਹਾਡੇ ਅਕਾਊਂਟ ਲਈ ਐਕਟਿਵ ਮਾਡਲਾਂ ਦੀ ਲਿਸਟ ਲਵੋ
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const modelsData = await modelsRes.json();

    if (!modelsRes.ok || !modelsData.data || modelsData.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Groq Auth Error: " + (modelsData.error?.message || "ਕੀਅ ਚੈੱਕ ਕਰੋ")
      });
    }

    // ਟੈਕਸਟ ਚੈਟ ਵਾਲੇ ਮਾਡਲ ਚੁਣੋ (Whisper/Audio ਨੂੰ ਛੱਡ ਕੇ)
    const chatModels = modelsData.data
      .map(m => m.id)
      .filter(id => !id.includes("whisper"));

    const targetModel = chatModels[0];

    // 2. ਚੁਣੇ ਹੋਏ ਐਕਟਿਵ ਮਾਡਲ ਨਾਲ ਜਵਾਬ ਲਵੋ
    const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.2
      })
    });

    const chatData = await chatRes.json();

    if (chatRes.ok && chatData.choices?.[0]?.message?.content) {
      return res.status(200).json({
        success: true,
        answer: chatData.choices[0].message.content
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Model (${targetModel}) Error: ` + (chatData.error?.message || "ਨਤੀਜਾ ਨਹੀਂ ਮਿਲਿਆ")
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Catch: " + err.message
    });
  }
}
