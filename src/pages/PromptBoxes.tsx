import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  autoExtract,
  buildCleanPrompt,
  buildPromptDoc,
  getFieldStatusMap,
  getMissingQuestions,
  mergeTemplateFields,
  normalizeKey,
  parseImportedDoc,
  TEMPLATE_FIELDS,
  type PromptTemplateId,
} from "@/lib/prompt-boxes";

function statusClasses(status: "confident" | "review" | "missing") {
  if (status === "confident") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "review") return "border-yellow-400/30 bg-yellow-500/10 text-yellow-200";
  return "border-red-400/30 bg-red-500/10 text-red-200";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Clipboard failed" };
  }
}

export default function PromptBoxes() {
  const [template, setTemplate] = useState<PromptTemplateId>("universal");
  const [promptRaw, setPromptRaw] = useState("");
  const [fields, setFields] = useState<Record<string, string>>(() => mergeTemplateFields("universal", {}));
  const [newFieldName, setNewFieldName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const importRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setFields((prev) => mergeTemplateFields(template, prev));
  }, [template]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const doc = useMemo(() => buildPromptDoc(template, promptRaw, fields), [fields, promptRaw, template]);
  const docJson = useMemo(() => JSON.stringify(doc, null, 2), [doc]);
  const cleanPrompt = useMemo(() => buildCleanPrompt(template, fields), [fields, template]);
  const fieldStatus = useMemo(() => getFieldStatusMap(template, fields), [fields, template]);
  const missingQuestions = useMemo(() => getMissingQuestions(template, fields), [fields, template]);
  const fieldEntries = useMemo(() => Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)), [fields]);
  const templateFields = useMemo(() => (template === "custom" ? [] : TEMPLATE_FIELDS[template]), [template]);
  const statusSummary = useMemo(() => {
    return Object.values(fieldStatus).reduce(
      (acc, status) => {
        acc[status] += 1;
        return acc;
      },
      { confident: 0, review: 0, missing: 0 },
    );
  }, [fieldStatus]);

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function removeField(key: string) {
    if (templateFields.includes(key)) {
      setField(key, "");
      setFeedback(`Cleared ${key}.`);
      return;
    }
    setFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFeedback(`Removed ${key}.`);
  }

  function handleAddField() {
    const key = normalizeKey(newFieldName);
    if (!key) {
      setFeedback("Field name is empty.");
      return;
    }
    if (fields[key] !== undefined) {
      setFeedback("That field already exists.");
      return;
    }
    setFields((prev) => ({ ...prev, [key]: "" }));
    setNewFieldName("");
    setFeedback(`Added ${key}.`);
  }

  function applyExtract(overwrite: boolean) {
    const extracted = autoExtract(promptRaw, template);
    setFields((prev) => {
      const merged = overwrite ? { ...extracted } : { ...prev };
      if (!overwrite) {
        for (const [key, value] of Object.entries(extracted)) {
          if (!merged[key]?.trim()) merged[key] = value;
        }
      }
      return mergeTemplateFields(template, merged);
    });
    setFeedback(overwrite ? "Fields overwritten from prompt." : "Empty fields filled from prompt.");
  }

  async function handleCopyJson() {
    const result = await copyText(docJson);
    setFeedback(result.ok ? "JSON copied." : `Copy failed: ${result.error}`);
  }

  async function handleCopyCleanPrompt() {
    const result = await copyText(cleanPrompt);
    setFeedback(result.ok ? "Clean prompt copied." : `Copy failed: ${result.error}`);
  }

  async function handleCopyRaw() {
    const result = await copyText(promptRaw);
    setFeedback(result.ok ? "Raw prompt copied." : `Copy failed: ${result.error}`);
  }

  function handleImport() {
    const imported = parseImportedDoc(importRef.current?.value ?? "");
    if (!imported.ok) {
      setFeedback(`Import error: ${imported.error}`);
      return;
    }
    setTemplate(imported.value.meta.template);
    setPromptRaw(imported.value.prompt_raw);
    setFields(imported.value.fields);
    setFeedback("Imported prompt doc.");
  }

  return (
    <AppShell
      eyebrow="Cleanup Lab"
      title="Prompt Boxes"
      description="Paste a rough prompt, pull structure out of it, fill the missing gaps, and leave with both clean JSON and a usable draft."
      actions={
        <>
          <Link href="/optimizer">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Optimizer
            </Button>
          </Link>
          <Link href="/tutorials">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Tutorials
            </Button>
          </Link>
        </>
      }
    >
      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">1. Paste</p>
          <p className="text-sm leading-6 text-zinc-300">Drop in the messy prompt, notes, or partial JSON you already have.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">2. Extract</p>
          <p className="text-sm leading-6 text-zinc-300">Auto-fill reusable fields, then correct anything that needs review.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">3. Copy</p>
          <p className="text-sm leading-6 text-zinc-300">Take the clean JSON doc or the plain-language prompt draft into the next tool.</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-yellow-500/20 bg-black/55 p-5 shadow-[0_35px_110px_rgba(0,0,0,0.35)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-yellow-200">Workspace</h2>
            <p className="text-xs text-gray-300">Choose a template, paste the rough version, then work left to right.</p>
          </div>
          <label className="space-y-2 text-xs text-gray-300">
            <span>Template</span>
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value as PromptTemplateId)}
              className="h-10 rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
            >
              <option value="universal">Universal</option>
              <option value="chat">Chat</option>
              <option value="image">Image</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-yellow-300/70">Template</p>
            <p className="mt-2 text-2xl font-semibold text-white">{template}</p>
            <p className="mt-1 text-sm text-zinc-400">Current extraction shape.</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-black/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Confident</p>
            <p className="mt-2 text-2xl font-semibold text-white">{statusSummary.confident}</p>
            <p className="mt-1 text-sm text-zinc-400">Fields that look solid.</p>
          </div>
          <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-yellow-300/70">Review</p>
            <p className="mt-2 text-2xl font-semibold text-white">{statusSummary.review}</p>
            <p className="mt-1 text-sm text-zinc-400">Fields worth checking.</p>
          </div>
          <div className="rounded-2xl border border-red-500/15 bg-black/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-red-300/70">Missing</p>
            <p className="mt-2 text-2xl font-semibold text-white">{statusSummary.missing}</p>
            <p className="mt-1 text-sm text-zinc-400">Gaps still blocking a clean draft.</p>
          </div>
        </div>

        {feedback && (
          <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
            {feedback}
          </div>
        )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-5 space-y-4">
              <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-yellow-100">Raw Prompt</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={handleCopyRaw}
                      disabled={!promptRaw.trim()}
                    >
                      Copy Raw
                    </Button>
                    <Button
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={() => setPromptRaw("")}
                      disabled={!promptRaw}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={promptRaw}
                  onChange={(event) => setPromptRaw(event.target.value)}
                  className="min-h-[240px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                  placeholder="Paste a messy prompt here. Use lines like system:, user:, lighting:, output format:, or negative prompt: when you can."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => applyExtract(false)} disabled={!promptRaw.trim()}>
                    Extract Into Empty Fields
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => applyExtract(true)}
                    disabled={!promptRaw.trim()}
                  >
                    Overwrite From Prompt
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-4 space-y-3">
                <h3 className="text-lg font-semibold text-yellow-100">Import Existing JSON</h3>
                <Textarea
                  ref={importRef}
                  className="min-h-[180px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                  placeholder='Paste a prior prompt doc here, for example {"type":"universal","prompt_raw":"...","fields":{...},"meta":{...}}'
                />
                <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={handleImport}>
                  Import Prompt Doc
                </Button>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-4 space-y-3">
                <h3 className="text-lg font-semibold text-yellow-100">Quick Review</h3>
                {missingQuestions.length === 0 ? (
                  <p className="text-sm text-gray-300">The core fields for this template are filled. Review anything marked for attention, then copy your output.</p>
                ) : (
                  <div className="space-y-2">
                    {missingQuestions.map((question, index) => (
                      <div key={`${index}-${question}`} className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                        {question}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="xl:col-span-7 space-y-4">
              <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-yellow-100">Editable Fields</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      value={newFieldName}
                      onChange={(event) => setNewFieldName(event.target.value)}
                      className="w-[220px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                      placeholder="Add field, e.g. audience"
                    />
                    <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={handleAddField}>
                      Add Field
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fieldEntries.map(([key, value]) => {
                    const status = fieldStatus[key] ?? "missing";
                    return (
                      <div key={key} className="rounded-xl border border-yellow-500/20 bg-black/30 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-yellow-100">{key}</p>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusClasses(status)}`}>
                              {status}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                            onClick={() => removeField(key)}
                          >
                            {templateFields.includes(key) ? "Clear" : "Remove"}
                          </Button>
                        </div>
                        <Textarea
                          value={value}
                          onChange={(event) => setField(key, event.target.value)}
                          className="min-h-[110px] bg-black/20 border-yellow-500/20 text-white placeholder:text-gray-500"
                          placeholder={`Write ${key.replace(/_/g, " ")}...`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-yellow-100">Prompt Doc JSON</h3>
                    <Button
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={handleCopyJson}
                    >
                      Copy JSON
                    </Button>
                  </div>
                  <Textarea
                    value={docJson}
                    readOnly
                    className="min-h-[360px] bg-black/20 border-yellow-500/20 text-white font-mono text-xs"
                  />
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-yellow-100">Clean Prompt Draft</h3>
                    <Button
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={handleCopyCleanPrompt}
                      disabled={!cleanPrompt.trim()}
                    >
                      Copy Draft
                    </Button>
                  </div>
                  <Textarea
                    value={cleanPrompt || "Fill some fields or run extraction to generate a cleaned prompt draft."}
                    readOnly
                    className="min-h-[360px] bg-black/20 border-yellow-500/20 text-white"
                  />
                </div>
              </div>
            </section>
          </div>
      </section>
    </AppShell>
  );
}
