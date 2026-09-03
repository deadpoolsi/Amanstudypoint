export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ success: false, message: "ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ ਸਵਾਲ ਲਿਖੋ।" });
  }

  const promptText = `ਤੁਸੀਂ "Aman Study Point Mansa" ਦੇ ਅਧਿਕਾਰਤ Study AI Expert ਹੋ। ਸਿਰਫ਼ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ (Punjab Police, Patwari, SSC, Railway) ਅਤੇ ਸਿਲੇਬਸ ਦੇ ਸਵਾਲਾਂ ਦਾ ਸਰਲ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ। ਸਹੀ ਉੱਤਰ ਪਹਿਲੀ ਲਾਈਨ ਵਿੱਚ ਦਿਓ। ਸਵਾਲ: ${query}`;

  try {
    const encodedPrompt = encodeURIComponent(promptText);
    const response = await fetch(`https://text.pollinations.ai/${encodedPrompt}?model=mistral`);

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const answer = await response.text();

    if (!answer || !answer.trim()) {
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
