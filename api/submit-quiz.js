export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  const { phone, name, userAnswers, version } = req.body;
  const FIREBASE_DB_URL = "https://aman-study-point-default-rtdb.firebaseio.com";
  const DB_SECRET = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : "";

  if (!phone || !Array.isArray(userAnswers)) {
    return res.status(400).json({ success: false, message: "Missing required quiz data" });
  }

  try {
    // 1. ਮੌਜੂਦਾ ਟੈਸਟ ਦੇ ਅਸਲ ਪ੍ਰਸ਼ਨ ਅਤੇ ਵਰਜਨ ਡਾਟਾਬੇਸ ਤੋਂ ਲਵੋ
    const [quizRes, verRes, attemptRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/dailyQuiz.json${DB_SECRET}`),
      fetch(`${FIREBASE_DB_URL}/quizVersion.json${DB_SECRET}`),
      fetch(`${FIREBASE_DB_URL}/userAttempts/${phone}/${version || "v1"}.json${DB_SECRET}`)
    ]);

    const activeQuiz = await quizRes.json();
    const currentVersion = (await verRes.json()) || "v1";
    const existingAttempt = await attemptRes.json();

    // ਜੇਕਰ ਵਿਦਿਆਰਥੀ ਪਹਿਲਾਂ ਹੀ ਟੈਸਟ ਦੇ ਚੁੱਕਾ ਹੈ
    if (existingAttempt) {
      return res.status(400).json({ success: false, message: "You have already attempted this test." });
    }

    if (!Array.isArray(activeQuiz) || activeQuiz.length === 0) {
      return res.status(500).json({ success: false, message: "Quiz data not found" });
    }

    // 2. ਸਰਵਰ ਉੱਤੇ ਅਸਲ ਸਕੋਰ ਕੈਲਕੁਲੇਟ ਕਰੋ
    let calculatedScore = 0;
    activeQuiz.forEach((q, idx) => {
      if (userAnswers[idx] !== undefined && Number(userAnswers[idx]) === Number(q.answer)) {
        calculatedScore++;
      }
    });

    const totalQuestions = activeQuiz.length;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 3. ਸਰਵਰ ਵੱਲੋਂ ਡਾਟਾਬੇਸ ਵਿੱਚ ਸਕੋਰ ਸੇਵ ਕਰੋ
    await fetch(`${FIREBASE_DB_URL}/userAttempts/${phone}/${currentVersion}.json${DB_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: calculatedScore,
        total: totalQuestions,
        time: new Date().toLocaleString()
      })
    });

    await fetch(`${FIREBASE_DB_URL}/quizResults.json${DB_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || "Student",
        phone: phone,
        score: calculatedScore,
        total: totalQuestions,
        version: currentVersion,
        time: timeStr
      })
    });

    return res.status(200).json({
      success: true,
      score: calculatedScore,
      total: totalQuestions,
      percentage: Math.round((calculatedScore / totalQuestions) * 100)
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
