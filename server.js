// KEEP THIS FILE PRIVATE — API KEY INSIDE — NEVER SHARE ONLINE

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Replace with your Groq API key locally or set GROQ_API_KEY in your environment
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT =
  "You are TridentX AI, a sharp, helpful, and concise intelligent assistant powered by Groq Llama 3.3. Remember previous messages in the conversation and give clear, accurate answers.";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function getFallbackReply(userMessage, history) {
  const lower = userMessage.toLowerCase().trim();
  if (/^(hi|hello|hey)\b/.test(lower)) {
    return "Hello! I'm TridentX AI. I'm currently using my built-in fallback response because the Groq API key isn't active yet, but everything else is ready!";
  }
  if (lower.includes("remember") || lower.includes("history")) {
    const count = history.filter((m) => m.role === "user").length;
    return `I have ${count} earlier user message(s) in this thread's memory. Once a valid GROQ_API_KEY is set in server.js, Llama 3.3 will answer using the full context.`;
  }
  return `I received "${userMessage}". Live Groq inference is currently unavailable (check your GROQ_API_KEY in server.js or internet connection), so I'm responding with this friendly fallback message.`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const cleanHistory = Array.isArray(history)
      ? history
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.trim()
          )
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.trim() }))
      : [];

    if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
      return res.json({
        reply: getFallbackReply(message.trim(), cleanHistory),
        fallback: true,
      });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...cleanHistory,
      { role: "user", content: message.trim() },
    ];

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status);
      return res.json({
        reply: getFallbackReply(message.trim(), cleanHistory),
        fallback: true,
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.json({
        reply: getFallbackReply(message.trim(), cleanHistory),
        fallback: true,
      });
    }

    return res.json({ reply, model: GROQ_MODEL, fallback: false });
  } catch (err) {
    console.error("Server error:", err.message);
    return res.json({
      reply:
        "I had trouble reaching the Groq network right now, so here is a friendly fallback reply. Please try again in a moment!",
      fallback: true,
    });
  }
});

app.listen(PORT, () => {
  console.log(`TridentX AI server running at http://localhost:${PORT}`);
});
