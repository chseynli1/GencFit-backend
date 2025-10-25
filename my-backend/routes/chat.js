// routes/chat.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const BASE = "https://generativelanguage.googleapis.com";

router.post("/", async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.toString().trim()) {
    return res.status(400).json({ reply: "Mesaj boş ola bilməz" });
  }
  if (!KEY) {
    return res.status(500).json({ reply: "Server: GEMINI_API_KEY yoxdur" });
  }

  try {
    const url = `${BASE}/v1/models/${MODEL}:generateContent?key=${KEY}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: message }] }],
    };

    const r = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    // Cavabı düzgün çıxart
    const cand = r.data?.candidates?.[0];
    const text = (cand?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();

    if (!text)
      return res.status(502).json({ reply: "Modeldən cavab alınmadı." });
    return res.json({ reply: text });
  } catch (err) {
    console.error("Chat API error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    return res
      .status(500)
      .json({ reply: `Sənin dediyini başa düşdüm: "${message}"` });
  }
});

module.exports = router;
