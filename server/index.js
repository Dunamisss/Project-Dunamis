import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const USAGE_LIMIT = Number.parseInt(process.env.DAILY_LIMIT || "3", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const allowList = (process.env.ALLOWLIST_EMAILS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const DISPOSABLE_BLOCKLIST_URL =
  process.env.DISPOSABLE_BLOCKLIST_URL ||
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/disposable_email_blocklist.conf";
const DISPOSABLE_ALLOWLIST_URL =
  process.env.DISPOSABLE_ALLOWLIST_URL ||
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/allowlist.conf";
const VPN_IPV4_URL =
  process.env.VPN_IPV4_URL ||
  "https://raw.githubusercontent.com/X4BNet/lists_vpn/refs/heads/main/output/vpn/ipv4.txt";

const usageByKey = new Map();
let disposableBlocklist = new Set();
let disposableAllowlist = new Set();
let vpnIpv4Cidrs = [];

function getUsageRecord(key) {
  const existing = usageByKey.get(key);
  if (!existing) {
    const record = { count: 0, is_banned: false };
    usageByKey.set(key, record);
    return record;
  }
  return existing;
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_ENABLED) return null;
  const base = SUPABASE_URL.replace(/\/+$/, "");
  const url = `${base}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: getSupabaseHeaders(options.headers || {}),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Supabase error ${response.status}: ${errorText || "Request failed."}`);
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function supabaseSelectSingle(table, filters) {
  const params = new URLSearchParams({ select: "*" });
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  params.set("limit", "1");
  const path = `${table}?${params.toString()}`;
  const rows = await supabaseRequest(path, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (Array.isArray(rows) && rows.length > 0) return rows[0];
  return null;
}

async function supabaseUpsert(table, payload) {
  return supabaseRequest(table, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
}

async function supabaseUpdate(table, filters, payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  const path = `${table}?${params.toString()}`;
  return supabaseRequest(path, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
}

async function supabaseDomainBlocked(domain) {
  if (!SUPABASE_ENABLED || !domain) return false;
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return false;
  const candidates = [];
  for (let i = 0; i < parts.length - 1; i += 1) {
    candidates.push(parts.slice(i).join("."));
  }
  const params = new URLSearchParams({ select: "domain", limit: "1" });
  params.set("domain", `in.(${candidates.join(",")})`);
  const path = `blocked_domains?${params.toString()}`;
  try {
    const rows = await supabaseRequest(path, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.warn("Supabase blocked domain lookup failed.", error);
    return false;
  }
}

function parseDomainList(text) {
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#"))
  );
}

function domainMatchesList(domain, list) {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return false;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join(".");
    if (list.has(candidate)) return true;
  }
  return false;
}

function isDisposableEmail(email) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@").pop()?.trim().toLowerCase() || "";
  if (!domain) return false;
  if (domainMatchesList(domain, disposableAllowlist)) return false;
  return domainMatchesList(domain, disposableBlocklist);
}

function ipToInt(ip) {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  );
}

function parseCidrList(text) {
  const cidrs = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [ip, bitsRaw] = trimmed.split("/");
    const bits = bitsRaw ? Number.parseInt(bitsRaw, 10) : 32;
    if (!ip || Number.isNaN(bits) || bits < 0 || bits > 32) continue;
    const ipInt = ipToInt(ip);
    if (ipInt === null) continue;
    const mask = bits === 0 ? 0 : ((~0 << (32 - bits)) >>> 0);
    cidrs.push({ base: ipInt & mask, mask });
  }
  return cidrs;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded || "").split(",")[0]?.trim();
  const candidate = raw || req.ip || "";
  if (!candidate) return null;
  if (candidate.includes(".") && candidate.includes(":")) {
    return candidate.split(":").pop() || null;
  }
  return candidate.includes(".") ? candidate : null;
}

function isLikelyVpnIp(ip) {
  if (!ip || vpnIpv4Cidrs.length === 0) return false;
  const ipInt = ipToInt(ip);
  if (ipInt === null) return false;
  for (const { base, mask } of vpnIpv4Cidrs) {
    if ((ipInt & mask) === base) return true;
  }
  return false;
}

async function loadLists() {
  try {
    const [blocklistText, allowlistText, vpnText] = await Promise.all([
      fetch(DISPOSABLE_BLOCKLIST_URL).then((res) => (res.ok ? res.text() : "")),
      fetch(DISPOSABLE_ALLOWLIST_URL).then((res) => (res.ok ? res.text() : "")),
      fetch(VPN_IPV4_URL).then((res) => (res.ok ? res.text() : "")),
    ]);

    if (blocklistText) disposableBlocklist = parseDomainList(blocklistText);
    if (allowlistText) disposableAllowlist = parseDomainList(allowlistText);
    if (vpnText) vpnIpv4Cidrs = parseCidrList(vpnText);
  } catch (error) {
    console.warn("Warning: failed to refresh blocklists", error);
  }
}

loadLists();
setInterval(loadLists, 24 * 60 * 60 * 1000);

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
  const requestStartedAt = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY in server environment." });
  }

  const { systemPrompt, prompt, context, images, userEmail } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
  const clientIp = getClientIp(req);
  const usageKey = normalizedEmail || (clientIp ? `ip:${clientIp}` : "anonymous");
  let isAllowlisted = Boolean(normalizedEmail && allowList.includes(normalizedEmail));

  if (!isAllowlisted && normalizedEmail && isDisposableEmail(normalizedEmail)) {
    return res.status(400).json({ error: "Disposable email addresses are not allowed." });
  }

  if (SUPABASE_ENABLED && normalizedEmail) {
    try {
      const allowRow = await supabaseSelectSingle("optimizer_allowlist", { email: normalizedEmail });
      if (allowRow?.unlimited) {
        isAllowlisted = true;
      }
    } catch (error) {
      console.warn("Supabase allowlist lookup failed.", error);
    }
  }

  if (SUPABASE_ENABLED && normalizedEmail) {
    const domain = normalizedEmail.split("@").pop()?.trim().toLowerCase();
    if (domain) {
      const blocked = await supabaseDomainBlocked(domain);
      if (blocked) {
        return res.status(400).json({ error: "Email domain is blocked. Please use a different address." });
      }
    }
  }

  let usageRecord = null;
  if (SUPABASE_ENABLED) {
    try {
      usageRecord = await supabaseSelectSingle("optimizer_usage", { email: usageKey });
      if (usageRecord?.is_banned) {
        return res.status(403).json({ error: "Account banned. Please contact support." });
      }
    } catch (error) {
      console.warn("Supabase usage lookup failed.", error);
      usageRecord = null;
    }
  } else {
    usageRecord = getUsageRecord(usageKey);
    if (usageRecord?.is_banned) {
      return res.status(403).json({ error: "Account banned. Please contact support." });
    }
  }

  let remaining = null;
  let limit = USAGE_LIMIT;
  if (!isAllowlisted) {
    const currentCount = usageRecord?.count || 0;
    if (currentCount >= USAGE_LIMIT) {
      return res.status(429).json({ error: "Usage limit reached. Please donate for unlimited access.", remaining: 0, limit });
    }
    const nextCount = currentCount + 1;
    remaining = Math.max(USAGE_LIMIT - nextCount, 0);

    if (SUPABASE_ENABLED) {
      try {
        const now = new Date().toISOString();
        if (usageRecord) {
          await supabaseUpdate(
            "optimizer_usage",
            { email: usageKey },
            { count: nextCount, last_used_at: now }
          );
        } else {
          await supabaseUpsert("optimizer_usage", {
            email: usageKey,
            count: nextCount,
            first_used_at: now,
            last_used_at: now,
            is_banned: false,
          });
        }
      } catch (error) {
        console.warn("Supabase usage update failed.", error);
      }
    } else {
      const record = getUsageRecord(usageKey);
      record.count = nextCount;
    }
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const contextBlock = context ? `\n\nAdditional context:\n${context}` : "";
  const imageBlock = Array.isArray(images) && images.length
    ? `\n\nImages attached (names only):\n${images.join(", ")}` 
    : "";
  const vpnWarning = isLikelyVpnIp(clientIp);
  const warningMessage = vpnWarning
    ? "We detected a VPN/proxy IP. Access is allowed, but this may trigger review."
    : null;

  try {
    const groqStartedAt = Date.now();
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
    const groqFinishedAt = Date.now();

    if (!response.ok) {
      const errText = await response.text();
      const totalMs = Date.now() - requestStartedAt;
      const groqMs = groqFinishedAt - groqStartedAt;
      console.warn("Groq error", {
        status: response.status,
        totalMs,
        groqMs,
        model,
      });
      return res.status(response.status).json({ error: errText || "Groq API error." });
    }

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content ?? "";
    const totalMs = Date.now() - requestStartedAt;
    const groqMs = groqFinishedAt - groqStartedAt;
    return res.json({
      output,
      remaining,
      limit,
      unlimited: isAllowlisted,
      vpnWarning,
      warningMessage,
      timing: {
        totalMs,
        groqMs,
        model,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
});

app.post("/api/kofi-webhook", async (req, res) => {
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
      if (SUPABASE_ENABLED) {
        try {
          await supabaseUpsert("optimizer_allowlist", { email, unlimited: true });
        } catch (error) {
          console.warn("Supabase allowlist update failed.", error);
        }
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
