import { useEffect, useMemo, useState } from "react";
import type { PromptDoc, ParseResponse } from "../types";
import { parsePrompt, renderCleanPrompt } from "../api";
import { debounce } from "../utils/debounce";
import BoxesEditor from "./BoxesEditor";

type Props = {
  doc: PromptDoc;
  setDoc: (d: PromptDoc) => void;
  setCleanPrompt: (t: string) => void;
  setActiveTab: (t: "json" | "prompt") => void;
};

export default function PasteMode({ doc, setDoc, setCleanPrompt, setActiveTab }: Props) {
  const [status, setStatus] = useState<"idle" | "parsing" | "error">("idle");
  const [missing, setMissing] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [isImproving, setIsImproving] = useState(false);

  const doParse = useMemo(
    () =>
      debounce(async (text: string) => {
        try {
          setStatus("parsing");
          const res: ParseResponse = await parsePrompt(text);
          setDoc(res.data);
          setMissing(res.missing_questions ?? []);
          setConfidence(res.field_confidence ?? {});
          const clean = await renderCleanPrompt(res.data);
          setCleanPrompt(clean);
          setStatus("idle");
        } catch {
          setStatus("error");
        }
      }, 450),
    [setDoc, setCleanPrompt]
  );

  useEffect(() => {
    (async () => {
      try {
        const clean = await renderCleanPrompt(doc);
        setCleanPrompt(clean);
      } catch {
      }
    })();
  }, [doc, setCleanPrompt]);

  async function handleFixBoxes() {
    try {
      setIsImproving(true);
      const clean = await renderCleanPrompt(doc);
      const res = await parsePrompt(clean);
      setDoc({ ...res.data, source_prompt: doc.source_prompt });
      setMissing(res.missing_questions ?? []);
      setConfidence(res.field_confidence ?? {});
      setCleanPrompt(await renderCleanPrompt(res.data));
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      setIsImproving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Paste a messy prompt</div>
        <textarea
          className="mt-2 w-full rounded-xl border p-3 text-sm"
          rows={7}
          value={doc.source_prompt}
          onChange={(e) => {
            const v = e.target.value;
            setDoc({ ...doc, source_prompt: v });
            doParse(v);
          }}
          placeholder="Paste anything you have. The app will convert it into boxes."
        />
        <div className="mt-2 flex items-center justify-between text-xs opacity-70">
          <div>
            {status === "parsing" ? "Parsing..." : status === "error" ? "Parse error (check API running)" : "Ready"}
          </div>
          <div className="flex items-center gap-3">
            <button className="underline" onClick={handleFixBoxes} type="button" disabled={isImproving}>
              {isImproving ? "Improving..." : "Fix my boxes"}
            </button>
            <button className="underline" onClick={() => setActiveTab("prompt")} type="button">
              View Clean Prompt
            </button>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="mt-3 rounded-xl border bg-neutral-50 p-3">
            <div className="text-xs font-semibold">Quick questions (optional)</div>
            <ul className="mt-2 list-disc pl-5 text-xs">
              {missing.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <BoxesEditor doc={doc} onChange={setDoc} confidence={confidence} />
    </div>
  );
}

