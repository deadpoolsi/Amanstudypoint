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
    return res.status(500).json({ success: false, message: "⚠️ GROQ_API_KEY ਮੌਜੂਦ ਨਹੀਂ ਹੈ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ।
ਤੁਹਾਡਾ ਕੰਮ:
1. ਸਿਰਫ਼ ਮੁਕਾਬਲੇ ਦੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ (Maths, GK, Reasoning, Punjabi Grammar, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ।
2. ਗੈਰ-ਪੜ੍ਹਾਈ ਸਵਾਲਾਂ 'ਤੇ ਸਿਰਫ਼ ਇਹ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਅਤੇ ਪੜ੍ਹਾਈ ਦੇ ਸਵਾਲਾਂ ਲਈ ਹੈ।"
3. ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਸਪਸ਼ਟ ਦਿਓ।`;

  // ਤੁਹਾਡੇ ਡੈਸ਼ਬੋਰਡ ਵਿੱਚ ਦਿਖ ਰਹੇ ਐਕਟਿਵ ਮਾਡਲ
  const activeModels = ["qwen-2.5-32b", "gpt-oss-120b", "llama3-8b-8192"];

  for (const modelName of activeModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
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
    } catch (err) {
      continue;
    }
  }

  return res.status(500).json({
    success: false,
    message: "ਸਰਵਰ ਜਵਾਬ ਤਿਆਰ ਨਹੀਂ ਕਰ ਸਕਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
  });
}
