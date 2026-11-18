const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const __filename = __filename;
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log("API Key loaded:", GROQ_API_KEY ? "✅ Found" : "❌ NOT SET");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT =
  "You are TridentX AI, a sharp, helpful, and concise intelligent assistant powered by Groq Llama 3.3.";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function getFallbackReply(userMessage, history) {
  const lower = userMessage.toLowerCase().trim();
  if (/^(hi|hello|hey)\b/.test(lower)) {
    return "Hello! I'm TridentX AI. Groq API is not active yet, but everything else is ready!";
  }
  return `I received "${userMessage}". Groq inference is currently unavailable, so I'm responding with this fallback message.`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!GROQ_API_KEY) {
      return res.json({
        reply: getFallbackReply(message.trim(), history),
        fallback: true
      });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-20),
      { role: "user", content: message.trim() }
    ];

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      console.error("Groq error:", response.status);
      return res.json({ reply: getFallbackReply(message.trim(), history), fallback: true });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    
    if (!reply) throw new Error("No reply from API");
    
    return res.json({ reply, fallback: false });
  } catch (err) {
    console.error("Server error:", err.message);
    return res.json({ 
      reply: "Network error. Please try again.",
      fallback: true
    });
  }
});

app.listen(PORT, () => {
  console.log(`TridentX AI running on port ${PORT}`);
});
