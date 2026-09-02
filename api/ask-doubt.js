export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { query } = req.body;
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    return res.status(500).json({ success: false, message: "GEMINI_API_KEY ਮੌਜੂਦ ਨਹੀਂ ਹੈ" });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    console.log("GOOGLE_RAW_RESPONSE:", JSON.stringify(data));

    if (data.error) {
      return res.status(400).json({
        success: false,
        message: `API Error [${data.error.code}]: ${data.error.message}`
      });
    }

    const modelNames = (data.models || []).map(m => m.name.replace("models/", ""));

    return res.status(200).json({
      success: true,
      answer: `ਕਨੈਕਸ਼ਨ ਸਫਲ ਰਿਹਾ! ਉਪਲਬਧ ਮਾਡਲ: ${modelNames.slice(0, 5).join(", ")}`
    });
  } catch (err) {
    console.error("CATCH_ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Fetch Catch: " + err.message
    });
  }
}
