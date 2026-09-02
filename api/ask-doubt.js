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
    return res.status(500).json({ success: false, message: "⚠️ GEMINI_API_KEY Vercel Environment Variables ਵਿੱਚ ਨਹੀਂ ਮਿਲੀ।" });
  }

  const systemPrompt = 
`ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ Study Expert ਹੋ।
ਸਿਰਫ਼ ਪੜ੍ਹਾਈ (Punjab Police, Patwari, SSC, Maths, GK, Reasoning, Punjabi Grammar, Computer) ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।
ਜੇਕਰ ਸਵਾਲ ਪੜ੍ਹਾਈ ਤੋਂ ਬਾਹਰ ਦਾ ਹੋਵੇ ਤਾਂ ਕਹੋ: "⚠️ ਇਹ ਸਰਚ ਸਿਰਫ਼ ਪੜ੍ਹਾਈ ਲਈ ਹੈ।"`;

  const fullPrompt = `${systemPrompt}\n\nਵਿਦਿਆਰਥੀ ਦਾ ਸਵਾਲ: ${query}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errDetail = data.error ? `${data.error.code} - ${data.error.message}` : `HTTP ${response.status}`;
      return res.status(400).json({ success: false, message: "Google API Error: " + errDetail });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) {
      return res.status(500).json({ success: false, message: "ਜਵਾਬ ਖਾਲੀ ਮਿਲਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" });
    }

    return res.status(200).json({ success: true, answer: answer });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Catch Error: " + error.message });
  }
}
