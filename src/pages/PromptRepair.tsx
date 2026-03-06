import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RepairIssue = {
  code: string;
  severity: "high" | "medium" | "low";
  message: string;
  evidence: string[];
};

type RepairResponse = {
  request_id: string;
  normalized_input: {
    raw_prompt: string;
    target_model: string | null;
    output_type: "text" | "json";
  };
  rule_scan: {
    quality_score: number;
    rewrite_needed: boolean;
    issues: RepairIssue[];
    recommendations: string[];
  };
  repaired_prompt: string | null;
  final_prompt: string;
  changes: string[];
  json_output: {
    role: string | null;
    objective: string;
    context: string[];
    constraints: string[];
    output_instructions: string[];
  } | null;
  processing: {
    rewrite_used: boolean;
    provider: string | null;
    model: string | null;
    fallback_message: string | null;
    duration_ms: number;
  };
};

const OUTPUT_INTENTS = [
  { value: "text", label: "Plain Text" },
  { value: "json", label: "JSON" },
] as const;

function issueTone(severity: RepairIssue["severity"]) {
  if (severity === "high") return "border-red-500/30 bg-red-500/10 text-red-100";
  if (severity === "medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
  return "border-sky-500/30 bg-sky-500/10 text-sky-100";
}

async function copyBlock(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function PromptRepair() {
  const [rawPrompt, setRawPrompt] = useState("");
  const [targetModel, setTargetModel] = useState("");
  const [outputType, setOutputType] = useState<"text" | "json">("text");
  const [includeJson, setIncludeJson] = useState(true);
  const [result, setResult] = useState<RepairResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim();
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/prompt-repair` : "/api/prompt-repair";

  const jsonOutput = useMemo(() => {
    if (!result?.json_output) return "";
    return JSON.stringify(result.json_output, null, 2);
  }, [result]);

  const handleRepair = async () => {
    if (!rawPrompt.trim()) {
      setError("Paste a prompt to repair first.");
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_prompt: rawPrompt.trim(),
          target_model: targetModel.trim() || null,
          output_type: outputType,
          include_json: includeJson,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Prompt repair failed (${response.status}).`);
      }

      setResult(data as RepairResponse);
      setFeedback(
        data?.processing?.rewrite_used
          ? "Repair complete."
          : "Rule scan complete. Rewrite was skipped or unavailable.",
      );
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    if (!text.trim()) return;
    try {
      await copyBlock(text);
      setFeedback(`${label} copied.`);
    } catch {
      setFeedback(`Copy failed for ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <header className="rounded-xl border border-yellow-500/30 bg-black/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">Prompt Repair</p>
              <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Detect Weaknesses, Then Rebuild The Prompt</h1>
              <p className="text-sm text-gray-300 max-w-3xl">
                Paste a weak prompt, get a deterministic defect scan first, then an optional repaired version and copy-ready final prompt.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Home
                </Button>
              </Link>
              <Link href="/optimizer">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Optimizer
                </Button>
              </Link>
              <Link href="/prompt-boxes">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Prompt Boxes
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-yellow-200">Input</h2>
              <p className="text-xs text-gray-300">This page is stateless. No account, no history, no library dependency.</p>
            </div>
            <Textarea
              value={rawPrompt}
              onChange={(event) => setRawPrompt(event.target.value)}
              className="min-h-[280px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
              placeholder="Paste the weak or messy prompt here..."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-2 text-xs text-gray-300">
                <span>Target model (optional)</span>
                <Input
                  value={targetModel}
                  onChange={(event) => setTargetModel(event.target.value)}
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                  placeholder="e.g. ChatGPT, Claude, Gemini"
                />
              </label>
              <label className="space-y-2 text-xs text-gray-300">
                <span>Output type</span>
                <select
                  value={outputType}
                  onChange={(event) => setOutputType(event.target.value as "text" | "json")}
                  className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                >
                  {OUTPUT_INTENTS.map((intent) => (
                    <option key={intent.value} value={intent.value}>
                      {intent.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={includeJson}
                onChange={(event) => setIncludeJson(event.target.checked)}
                className="h-4 w-4 rounded border-yellow-500/40 bg-black/40"
              />
              Include structured JSON output
            </label>
            <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-300" onClick={handleRepair} disabled={loading}>
              {loading ? "Repairing..." : "Scan And Repair"}
            </Button>
            {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}
            {!error && feedback && <p className="text-xs text-gray-300">{feedback}</p>}
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-yellow-200">Rule Findings</h2>
                <p className="text-xs text-gray-300">This scan is always shown first, even if rewrite is skipped.</p>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2 text-sm text-yellow-100">
                Score: {result ? `${result.rule_scan.quality_score}/100` : "Not run yet"}
              </div>
            </div>
            {result ? (
              <>
                <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 text-sm text-gray-200">
                  {result.rule_scan.rewrite_needed ? "Rewrite recommended." : "Rewrite not required based on rule scan."}
                </div>
                <div className="space-y-2">
                  {result.rule_scan.issues.length > 0 ? (
                    result.rule_scan.issues.map((issue) => (
                      <div key={issue.code} className={`rounded-md border p-3 space-y-2 ${issueTone(issue.severity)}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{issue.code.replace(/_/g, " ")}</p>
                          <span className="text-[11px] uppercase tracking-[0.22em]">{issue.severity}</span>
                        </div>
                        <p className="text-sm">{issue.message}</p>
                        {issue.evidence.length > 0 && (
                          <div className="space-y-1">
                            {issue.evidence.map((snippet, index) => (
                              <p key={`${issue.code}-${index}`} className="text-xs opacity-90">
                                Evidence: {snippet}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                      No major issues detected by the rule scan.
                    </div>
                  )}
                </div>
                {result.rule_scan.recommendations.length > 0 && (
                  <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 space-y-2">
                    <p className="text-sm font-semibold text-yellow-100">Recommendations</p>
                    {result.rule_scan.recommendations.map((item, index) => (
                      <p key={`${index}-${item}`} className="text-sm text-gray-300">
                        {index + 1}. {item}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4 text-sm text-gray-300">
                Paste a prompt and run the scan to see deterministic findings here.
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4 xl:col-span-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-yellow-200">Repaired Prompt</h2>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => handleCopy(result?.repaired_prompt || "", "Repaired prompt")}
                disabled={!result?.repaired_prompt}
              >
                Copy
              </Button>
            </div>
            <Textarea
              value={
                result?.repaired_prompt ||
                (result?.processing.fallback_message
                  ? "Rewrite unavailable. Showing rule-based guidance only."
                  : "A repaired prompt will appear here when rewrite runs.")
              }
              readOnly
              className="min-h-[320px] bg-black/40 border-yellow-500/30 text-white"
            />
            {result?.processing.fallback_message && (
              <p className="text-xs text-yellow-100">{result.processing.fallback_message}</p>
            )}
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4 xl:col-span-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-yellow-200">Final Prompt</h2>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => handleCopy(result?.final_prompt || "", "Final prompt")}
                disabled={!result?.final_prompt}
              >
                Copy
              </Button>
            </div>
            <Textarea
              value={result?.final_prompt || "The copy-ready final prompt will appear here."}
              readOnly
              className="min-h-[320px] bg-black/40 border-yellow-500/30 text-white"
            />
            {result?.changes.length ? (
              <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 space-y-2">
                <p className="text-sm font-semibold text-yellow-100">What changed</p>
                {result.changes.map((change, index) => (
                  <p key={`${index}-${change}`} className="text-sm text-gray-300">
                    {index + 1}. {change}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-black/70 p-5 space-y-4 xl:col-span-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-yellow-200">JSON Output</h2>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => handleCopy(jsonOutput, "JSON output")}
                disabled={!jsonOutput}
              >
                Copy
              </Button>
            </div>
            <Textarea
              value={jsonOutput || "Enable JSON output to see the normalized prompt structure here."}
              readOnly
              className="min-h-[320px] bg-black/40 border-yellow-500/30 text-white font-mono text-xs"
            />
            {result && (
              <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 text-xs text-gray-300 space-y-1">
                <p>Rewrite used: {result.processing.rewrite_used ? "Yes" : "No"}</p>
                <p>Provider: {result.processing.provider || "Rule-only"}</p>
                <p>Model: {result.processing.model || "Not used"}</p>
                <p>Latency: {result.processing.duration_ms} ms</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
