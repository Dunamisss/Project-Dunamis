import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.post("/api/optimize", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY in server environment." });
  }

  const { systemPrompt, prompt, context, images } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const contextBlock = context ? `\n\nAdditional context:\n${context}` : "";
  const imageBlock = Array.isArray(images) && images.length
    ? `\n\nImages attached (names only):\n${images.join(", ")}`
    : "";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt || "" },
          { role: "user", content: `${prompt}${contextBlock}${imageBlock}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText || "Groq API error." });
    }

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content ?? "";
    return res.json({ output });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Optimizer API running on http://localhost:${port}`);
});
