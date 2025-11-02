// routes/chat.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.CHAT_MODEL || "gemini-2.5-flash"; // ✅ tövsiyə olunan model
const BASE = "https://generativelanguage.googleapis.com";     // ✅ v1 endpoint
// Ref: https://ai.google.dev/api/generate-content (models.generateContent)  // info üçün

router.post("/", async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !message.toString().trim()) {
    return res.status(400).json({ success: false, reply: "Mesaj boş ola bilməz" });
  }
  if (!KEY) {
    return res.status(500).json({ success: false, reply: "Server: GEMINI_API_KEY yoxdur" });
  }

  try {
    const url = `${BASE}/v1/models/${MODEL}:generateContent?key=${KEY}`;

    const systemInstruction = {
      role: "user",
      parts: [{ text: "Sən GəncFİT platforması üçün köməkçi botsan. Cavabları qısa və konkret ver." }],
    };

    const historyAsContents = Array.isArray(history)
      ? history.map(m => ({
          role: m.role === "model" ? "model" : "user",
          parts: [{ text: String(m.content || "") }],
        }))
      : [];

    const payload = {
      contents: [
        systemInstruction,
        ...historyAsContents,
        { role: "user", parts: [{ text: message }] },
      ],
      // İstəyə görə generasiya parametrləri:
      // generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      // safetySettings: [...],
    };

    const r = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    const cand = r.data?.candidates?.[0];
    const text = (cand?.content?.parts || [])
      .map(p => p.text || "")
      .join("")
      .trim();

    if (!text) {
      const block = cand?.safetyRatings || r.data?.promptFeedback;
      return res.status(502).json({
        success: false,
        reply: "Modeldən cavab alınmadı.",
        meta: block ? { block } : undefined,
      });
    }

    return res.json({ success: true, reply: text });
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data;
    console.error("Chat API error:", { status, data, message: err.message });

    if (status === 429) {
      return res.status(429).json({
        success: false,
        reply: "Limit keçildi. Bir neçə saniyə sonra yenidən sınayın.",
      });
    }

    const apiMsg =
      data?.error?.message ||
      data?.promptFeedback?.blockReason ||
      err.message ||
      "Xəta baş verdi";

    return res.status(status).json({
      success: false,
      reply: apiMsg,
    });
  }
});

module.exports = router;
