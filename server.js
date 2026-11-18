const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ✅ KEY IS LOADED FROM RENDER ENVIRONMENT VARIABLES — NOT IN CODE!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = "You are TridentX AI, a helpful, friendly assistant. Keep answers clear and concise.";

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!GEMINI_API_KEY) {
      return res.json({ reply: "⚠️ API key not set. Add GEMINI_API_KEY in Render → Environment." });
    }

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: SYSTEM_PROMPT }] },
          { parts: [{ text: userMessage }] }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("API Error:", data.error);
      return res.json({ reply: "❌ Error: " + data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a reply.";
    res.json({ reply });

  } catch (err) {
    console.error("Server Error:", err);
    res.json({ reply: "⚠️ Connection error. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TridentX AI running on port ${PORT}`);
});
