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
ਤੁਹਾਡਾ ਕੰਮ:
1. ਸਿਰਫ਼ ਮੁਕਾਬਲੇ ਦੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ (Maths, GK, Reasoning, Punjabi Grammar, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ।
2. ਗੈਰ-ਪੜ੍ਹਾਈ ਸਵਾਲਾਂ 'ਤੇ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਅਤੇ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਲਈ ਹੈ।"
3. ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਸਪਸ਼ਟ ਦਿਓ।`;

  // ਤੁਹਾਡੇ ਡੈਸ਼ਬੋਰਡ ਦੇ ਐਕਟਿਵ Text-to-Text ਮਾਡਲ
  const targetModels = ["gpt-oss-120b", "gpt-oss-20b"];

  for (const model of targetModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query }
          ],
          temperature: 0.2,
          max_tokens: 600
        })
      });

      const data = await response.json();

      if (response.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({
          success: true,
          answer: data.choices[0].message.content
        });
      }
    } catch (e) {
      continue;
    }
  }

  return res.status(500).json({
    success: false,
    message: "ਸਰਵਰ ਜਵਾਬ ਤਿਆਰ ਨਹੀਂ ਕਰ ਸਕਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  });
}
