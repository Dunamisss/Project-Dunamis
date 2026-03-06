import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

type ParsedAudit = {
  score: number | null;
  verdict: string;
  flaws: string[];
};

const AUDITOR_SYSTEM_PROMPT =
  "ROLE:\n" +
  "You are a Lead Prompt Engineer and LLM Optimization Specialist.\n\n" +
  "OBJECTIVE:\n" +
  "Evaluate a user-submitted prompt, score it, critique it with zero fluff, and ask if it should be reconstructed.\n\n" +
  "OUTPUT FORMAT (STRICT):\n" +
  "1. Score: <integer 0-100>\n" +
  "2. Verdict: <one short sentence>\n" +
  "3. Flaws:\n" +
  "- Clarity: <issue>\n" +
  "- Constraints: <issue>\n" +
  "- Context: <issue>\n" +
  "4. Ask:\n" +
  "\"Shall I reconstruct this using advanced engineering techniques to maximize performance?\"\n\n" +
  "RULES:\n" +
  "- If Score < 80, Verdict must be: \"This prompt requires optimization to meet professional standards.\"\n" +
  "- No praise or filler.";

const JSON_CONVERTER_SYSTEM_PROMPT =
  "ROLE:\n" +
  "You are a senior prompt architect focused on strict JSON output.\n\n" +
  "OBJECTIVE:\n" +
  "Convert the user prompt into execution-ready JSON.\n\n" +
  "OUTPUT REQUIREMENTS:\n" +
  "- Return valid JSON only.\n" +
  "- No markdown fences.\n" +
  "- No prose outside JSON.\n" +
  "- Use this schema exactly:\n" +
  "{\n" +
  '  "prompt_template_id": "audit-json-conversion",\n' +
  '  "objective": "string",\n' +
  '  "instructions": {\n' +
  '    "strict_json": true,\n' +
  '    "no_filler": true,\n' +
  '    "keep_precise": true\n' +
  "  },\n" +
  '  "input_prompt": "string",\n' +
  '  "output_contract": ["role","objective","context","steps","constraints","output_schema"],\n' +
  '  "output_schema": {\n' +
  '    "role": "string",\n' +
  '    "objective": "string",\n' +
  '    "context": "string",\n' +
  '    "steps": ["string"],\n' +
  '    "constraints": ["string"],\n' +
  '    "output_schema": {\n' +
  '      "format": "json",\n' +
  '      "keys": ["string"]\n' +
  "    }\n" +
  "  }\n" +
  "}";

function parseAudit(output: string): ParsedAudit {
  const text = output.trim();
  const scoreMatch = text.match(/score:\s*(\d{1,3})/i);
  const verdictMatch = text.match(/verdict:\s*(.+)/i);
  const flawsBlockMatch = text.match(/flaws:\s*([\s\S]*?)(?:\n\s*4\.|\n\s*ask:|$)/i);

  const flaws =
    flawsBlockMatch?.[1]
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .slice(0, 3)
      .map((line) => line.replace(/^-+\s*/, "")) ?? [];

  return {
    score: scoreMatch ? Math.max(0, Math.min(100, Number(scoreMatch[1]))) : null,
    verdict: verdictMatch?.[1]?.trim() || "Audit completed.",
    flaws,
  };
}

export default function AuditJson() {
  const { user } = useAuth();
  const [promptInput, setPromptInput] = useState("");
  const [auditOutput, setAuditOutput] = useState("");
  const [jsonOutput, setJsonOutput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim();
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/optimize` : "/api/optimize";
  const parsedAudit = parseAudit(auditOutput);

  const requestJsonConversion = async (prompt: string, auditContext?: string) => {
    const context = auditContext?.trim()
      ? `Audit findings to account for:\n${auditContext.trim()}`
      : "";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: JSON_CONVERTER_SYSTEM_PROMPT,
        prompt,
        context,
        images: [],
        userEmail: user?.email || "",
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `JSON conversion failed (${response.status}).`);
    }

    return String(data?.output ?? "").trim();
  };

  const handleAudit = async () => {
    if (!promptInput.trim()) return;
    setError(null);
    setFeedback(null);
    setIsAuditing(true);
    setIsConverting(true);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: AUDITOR_SYSTEM_PROMPT,
          prompt: promptInput.trim(),
          context: "",
          images: [],
          userEmail: user?.email || "",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Audit failed (${response.status}).`);
      }

      const output = String(data?.output ?? "").trim();
      setAuditOutput(output);

      const converted = await requestJsonConversion(promptInput.trim(), output);
      setJsonOutput(converted);
      setFeedback("AI audit complete and converted to strict JSON.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAuditing(false);
      setIsConverting(false);
    }
  };

  const handleConvert = async () => {
    if (!promptInput.trim()) return;
    setError(null);
    setFeedback(null);
    setIsConverting(true);
    try {
      const output = await requestJsonConversion(promptInput.trim(), auditOutput);
      setJsonOutput(output);
      setFeedback("Converted to strict JSON with AI.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopy = async () => {
    if (!jsonOutput.trim()) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setFeedback("JSON copied.");
    } catch {
      setFeedback("Copy failed. Please copy manually.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <header className="rounded-xl border border-yellow-500/30 bg-black/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">Precision Lab</p>
              <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Audit And Convert To JSON</h1>
              <p className="text-sm text-gray-300 max-w-3xl">
                Model-based scoring and JSON conversion using your backend optimizer endpoint.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Home
                </Button>
              </Link>
              <Link href="/tutorials">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Tutorials
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4">
            <h2 className="text-xl font-semibold text-yellow-200">1) Prompt Input</h2>
            <Textarea
              value={promptInput}
              onChange={(event) => setPromptInput(event.target.value)}
              className="min-h-[260px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
              placeholder="Paste your current prompt here..."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
                onClick={handleAudit}
                disabled={isAuditing || isConverting || !promptInput.trim()}
              >
                {isAuditing || isConverting ? "Running..." : "Audit + Convert"}
              </Button>
              <Button
                variant="outline"
                className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={handleConvert}
                disabled={isAuditing || isConverting || !promptInput.trim()}
              >
                {isConverting ? "Converting..." : "Convert To JSON"}
              </Button>
            </div>
            {error && (
              <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>
            )}
            {!error && feedback && (
              <p className="text-xs text-gray-400">{feedback}</p>
            )}
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4">
            <h2 className="text-xl font-semibold text-yellow-200">2) Audit Result</h2>
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 space-y-2">
              <p className="text-sm text-yellow-100">
                Score: {parsedAudit.score !== null ? `${parsedAudit.score}/100` : "Not parsed yet"}
              </p>
              <p className="text-sm text-gray-300">{parsedAudit.verdict}</p>
              {parsedAudit.flaws.length > 0 && (
                <div className="space-y-1">
                  {parsedAudit.flaws.map((flaw, index) => (
                    <p key={`${index}-${flaw}`} className="text-xs text-gray-400">
                      {index + 1}. {flaw}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              value={auditOutput}
              readOnly
              className="min-h-[150px] bg-black/40 border-yellow-500/30 text-white text-xs"
              placeholder="Raw AI audit output will appear here..."
            />
          </div>
        </section>

        <section className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4">
          <h2 className="text-xl font-semibold text-yellow-200">3) JSON Output</h2>
          <Textarea
            value={jsonOutput}
            readOnly
            className="min-h-[260px] bg-black/40 border-yellow-500/30 text-white font-mono text-xs"
            placeholder="Converted JSON will appear here..."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={handleCopy}
              disabled={!jsonOutput.trim()}
            >
              Copy JSON
            </Button>
            <Link href="/optimizer">
              <Button
                variant="outline"
                className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              >
                Open Optimizer
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
