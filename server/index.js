import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const DAILY_LIMIT = Number.parseInt(process.env.DAILY_LIMIT || "3", 10);
const allowList = (process.env.ALLOWLIST_EMAILS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const usageByKey = new Map();

function todayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function getUsageRecord(key) {
  const today = todayKey();
  const existing = usageByKey.get(key);
  if (!existing || existing.date !== today) {
    const record = { date: today, count: 0 };
    usageByKey.set(key, record);
    return record;
  }
  return existing;
}

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowed = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowAll = allowed.length === 0 || allowed.includes("*");

  if (allowAll) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
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

  const { systemPrompt, prompt, context, images, userEmail } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
  const isAllowlisted = normalizedEmail && allowList.includes(normalizedEmail);
  let remaining = null;
  let limit = DAILY_LIMIT;
  if (!isAllowlisted) {
    const key = normalizedEmail || req.ip || "anonymous";
    const record = getUsageRecord(key);
    if (record.count >= DAILY_LIMIT) {
      return res.status(429).json({ error: "Daily limit reached. Please donate for unlimited access.", remaining: 0, limit });
    }
    record.count += 1;
    remaining = Math.max(DAILY_LIMIT - record.count, 0);
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
    return res.json({ output, remaining, limit, unlimited: isAllowlisted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

app.post("/api/kofi-webhook", (req, res) => {
  const token = process.env.KOFI_WEBHOOK_TOKEN;
  if (!token) {
    return res.status(500).send("Missing KOFI_WEBHOOK_TOKEN");
  }

  const payload = req.body?.data;
  if (!payload) {
    return res.status(400).send("Missing data payload");
  }

  try {
    const data = JSON.parse(payload);
    if (data?.verification_token !== token) {
      return res.status(403).send("Invalid token");
    }

    const email = (data?.email || "").toString().trim().toLowerCase();
    const isDonation = data?.type === "Donation";
    if (email && isDonation) {
      if (!allowList.includes(email)) {
        allowList.push(email);
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    return res.status(400).send("Invalid payload");
  }
});

app.listen(port, () => {
  console.log(`Optimizer API running on http://localhost:${port}`);
});
