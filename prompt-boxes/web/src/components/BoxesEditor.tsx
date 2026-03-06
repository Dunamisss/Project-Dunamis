import type { PromptDoc, InputItem } from "../types";
import ChipInput from "./ChipInput";

type Props = {
  doc: PromptDoc;
  onChange: (next: PromptDoc) => void;
  confidence?: Record<string, number>;
};

const OUTPUT_FORMATS = ["markdown", "json", "text", "html", "table"] as const;
type OutputFormat = (typeof OUTPUT_FORMATS)[number];

const INPUT_TYPES = ["text", "url", "file", "other"] as const;
type InputType = (typeof INPUT_TYPES)[number];

const LENGTHS = ["short", "medium", "long"] as const;
type Length = (typeof LENGTHS)[number];

export default function BoxesEditor({ doc, onChange, confidence }: Props) {
  function set<K extends keyof PromptDoc>(key: K, value: PromptDoc[K]) {
    onChange({ ...doc, [key]: value });
  }

  function setStyle<K extends keyof PromptDoc["style"]>(key: K, value: PromptDoc["style"][K]) {
    onChange({ ...doc, style: { ...doc.style, [key]: value } });
  }

  function setOutput<K extends keyof PromptDoc["output"]>(key: K, value: PromptDoc["output"][K]) {
    onChange({ ...doc, output: { ...doc.output, [key]: value } });
  }

  function addInput() {
    const next: InputItem = { name: `Input ${doc.inputs.length + 1}`, type: "text", value: "" };
    set("inputs", [...doc.inputs, next]);
  }

  function updateInput(i: number, patch: Partial<InputItem>) {
    const next = doc.inputs.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
    set("inputs", next);
  }

  function removeInput(i: number) {
    set("inputs", doc.inputs.filter((_, idx) => idx !== i));
  }

  const badge = (k: string) => {
    const v = confidence?.[k];
    if (v === undefined) return null;
    const label = v >= 0.75 ? "Confident" : v >= 0.5 ? "Review" : "Missing";
    const cls =
      v >= 0.75
        ? "bg-green-50 border-green-200"
        : v >= 0.5
          ? "bg-yellow-50 border-yellow-200"
          : "bg-red-50 border-red-200";
    return <span className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Goal{badge("goal")}</div>
        <textarea
          className="mt-2 w-full rounded-xl border p-3 text-sm"
          rows={3}
          value={doc.goal}
          onChange={(e) => set("goal", e.target.value)}
          placeholder="What do you want to achieve?"
        />
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Audience{badge("audience")}</div>
        <input
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
          value={doc.audience}
          onChange={(e) => set("audience", e.target.value)}
          placeholder="Who is this for?"
        />
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Inputs{badge("inputs")}</div>
          <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={addInput} type="button">
            Add
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {doc.inputs.map((i, idx) => (
            <div key={idx} className="rounded-xl border p-3">
              <div className="flex flex-wrap gap-2">
                <input
                  className="flex-1 rounded-lg border px-2 py-1 text-sm"
                  value={i.name}
                  onChange={(e) => updateInput(idx, { name: e.target.value })}
                  placeholder="Name"
                />
                <select
                  className="rounded-lg border px-2 py-1 text-sm"
                  value={i.type}
                  onChange={(e) => updateInput(idx, { type: e.target.value as InputType })}
                >
                  {INPUT_TYPES.map((inputType) => (
                    <option key={inputType} value={inputType}>
                      {inputType}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg border px-2 py-1 text-sm" onClick={() => removeInput(idx)} type="button">
                  Remove
                </button>
              </div>
              <textarea
                className="mt-2 w-full rounded-lg border p-2 text-sm"
                rows={3}
                value={i.value}
                onChange={(e) => updateInput(idx, { value: e.target.value })}
                placeholder="Paste text, link, or details here"
              />
            </div>
          ))}
          {!doc.inputs.length && <div className="text-sm opacity-70">No inputs yet.</div>}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Constraints{badge("constraints")}</div>
        <div className="mt-2">
          <ChipInput
            label=""
            value={doc.constraints}
            onChange={(v) => set("constraints", v)}
            placeholder="e.g. No emojis, Max 150 words, Must include a CTA"
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Style{badge("style")}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium opacity-70">Tone</div>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={doc.style.tone}
              onChange={(e) => setStyle("tone", e.target.value)}
            >
              {["neutral", "friendly", "formal", "professional", "casual", "persuasive", "funny", "serious", "empathetic"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <div className="text-xs font-medium opacity-70">Length</div>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={doc.style.length}
              onChange={(e) => setStyle("length", e.target.value as Length)}
            >
              {LENGTHS.map((length) => (
                <option key={length} value={length}>
                  {length}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs font-medium opacity-70">Voice</div>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={doc.style.voice}
              onChange={(e) => setStyle("voice", e.target.value)}
              placeholder="e.g. confident, beginner-friendly, direct"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs font-medium opacity-70">Reading level</div>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={doc.style.reading_level}
              onChange={(e) => setStyle("reading_level", e.target.value)}
              placeholder="e.g. simple, high school, expert"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Output{badge("output")}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium opacity-70">Format</div>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={doc.output.format}
              onChange={(e) => setOutput("format", e.target.value as OutputFormat)}
            >
              {OUTPUT_FORMATS.map((outputFormat) => (
                <option key={outputFormat} value={outputFormat}>
                  {outputFormat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs font-medium opacity-70">Schema (optional JSON)</div>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              defaultValue={doc.output.schema ? JSON.stringify(doc.output.schema) : ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) return setOutput("schema", null);
                try {
                  setOutput("schema", JSON.parse(v));
                } catch {
                }
              }}
              placeholder='e.g. {"title":"string","bullets":["string"]}'
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Notes</div>
        <textarea
          className="mt-2 w-full rounded-xl border p-3 text-sm"
          rows={3}
          value={doc.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything else you want remembered?"
        />
      </div>
    </div>
  );
}
