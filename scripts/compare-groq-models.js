import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_SYSTEM_PROMPT =
  "You are a prompt optimization assistant. Rewrite user requests into clear, high-quality prompts with explicit objective, context, constraints, and output format.";

const DEFAULT_PROMPTS = [
  "Write a Facebook post for a family-run cafe announcing a weekend brunch offer.",
  "Turn this into a professional email: we are delayed but still shipping today.",
  "Create a YouTube video outline about beginner AI automation for small businesses.",
  "Rewrite a rough prompt so it gives short, direct, non-technical answers.",
  "Make a prompt template for generating product descriptions for an online store.",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function splitCsv(value) {
  return (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function loadPrompts(args) {
  if (args["prompts-file"]) {
    const filePath = path.resolve(process.cwd(), args["prompts-file"]);
    const text = await fs.readFile(filePath, "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  }

  if (args.prompts) {
    return args.prompts
      .split("||")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  return DEFAULT_PROMPTS;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq({ apiKey, model, systemPrompt, prompt, temperature, maxTokens }) {
  const startedAt = Date.now();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  const elapsedMs = Date.now() - startedAt;
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      elapsedMs,
      error: payload?.error?.message || text || `HTTP ${response.status}`,
    };
  }

  return {
    ok: true,
    elapsedMs,
    output: payload?.choices?.[0]?.message?.content ?? "",
    usage: payload?.usage ?? null,
  };
}

function summarizeByModel(results) {
  const map = new Map();
  for (const result of results) {
    const key = result.model;
    if (!map.has(key)) {
      map.set(key, {
        model: key,
        total: 0,
        success: 0,
        fail: 0,
        totalMs: 0,
      });
    }
    const row = map.get(key);
    row.total += 1;
    row.totalMs += result.elapsedMs;
    if (result.ok) row.success += 1;
    else row.fail += 1;
  }
  return [...map.values()].map((row) => ({
    ...row,
    avgMs: Math.round(row.totalMs / Math.max(row.total, 1)),
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY in environment.");
  }

  const models = splitCsv(args.models || process.env.COMPARE_MODELS || process.env.GROQ_MODEL);
  if (models.length === 0) {
    throw new Error("No models provided. Use --models \"model-a,model-b\" or set COMPARE_MODELS.");
  }

  const prompts = await loadPrompts(args);
  if (prompts.length === 0) {
    throw new Error("No prompts found to evaluate.");
  }

  const systemPrompt = args.system || process.env.COMPARE_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
  const temperature = Number(args.temperature || process.env.COMPARE_TEMPERATURE || "0.2");
  const maxTokens = Number(args["max-tokens"] || process.env.COMPARE_MAX_TOKENS || "500");
  const delayMs = Number(args.delay || process.env.COMPARE_DELAY_MS || "250");

  console.log(`Models: ${models.join(", ")}`);
  console.log(`Prompts: ${prompts.length}`);
  console.log(`Temperature: ${temperature}, maxTokens: ${maxTokens}`);
  console.log("");

  const results = [];
  for (const model of models) {
    for (let i = 0; i < prompts.length; i += 1) {
      const prompt = prompts[i];
      process.stdout.write(`[${model}] Prompt ${i + 1}/${prompts.length} ... `);
      const res = await callGroq({
        apiKey,
        model,
        systemPrompt,
        prompt,
        temperature,
        maxTokens,
      });
      const record = {
        model,
        promptIndex: i + 1,
        prompt,
        ...res,
      };
      results.push(record);

      if (res.ok) {
        console.log(`OK ${res.elapsedMs}ms`);
      } else {
        console.log(`FAIL ${res.elapsedMs}ms - ${res.error}`);
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  const summary = summarizeByModel(results);
  console.log("\nSummary:");
  for (const row of summary) {
    console.log(
      `- ${row.model}: success ${row.success}/${row.total}, fail ${row.fail}, avg ${row.avgMs}ms`,
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(process.cwd(), "logs");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `groq-model-compare-${timestamp}.json`);
  await fs.writeFile(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        config: { models, promptsCount: prompts.length, temperature, maxTokens, delayMs },
        summary,
        results,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nSaved report: ${outFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
