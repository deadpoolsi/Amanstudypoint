export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, message: "ਸਵਾਲ ਲਿਖੋ" });

  try {
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a Punjabi tutor for Punjab competitive exams (Police, Patwari). Answer in simple Punjabi (Gurmukhi). Keep answers accurate and helpful." },
          { role: "user", content: query }
        ],
        model: "sur"
      })
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const text = await response.text();
    return res.status(200).json({ success: true, answer: text.trim() });
  } catch (err) {
    return res.status(500).json({ success: false, message: "ਸਰਵਰ ਸਮੱਸਿਆ: " + err.message });
  }
}
