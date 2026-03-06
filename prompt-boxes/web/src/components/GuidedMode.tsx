import type { PromptDoc } from "../types";
import BoxesEditor from "./BoxesEditor";

type Props = {
  doc: PromptDoc;
  setDoc: (d: PromptDoc) => void;
};

export default function GuidedMode({ doc, setDoc }: Props) {
  function applyTemplate(kind: string) {
    if (kind === "write") {
      setDoc({
        ...doc,
        goal: "Write a short piece of content",
        output: { ...doc.output, format: "markdown" },
        style: { ...doc.style, tone: "friendly", length: "medium" }
      });
    }
    if (kind === "summarize") {
      setDoc({
        ...doc,
        goal: "Summarize the provided text",
        output: { ...doc.output, format: "markdown" },
        constraints: Array.from(new Set([...doc.constraints, "Keep it accurate", "Use bullet points"]))
      });
    }
    if (kind === "extract") {
      setDoc({
        ...doc,
        goal: "Extract key info into JSON",
        output: { ...doc.output, format: "json" },
        constraints: Array.from(new Set([...doc.constraints, "Only use provided info", "Return valid JSON"]))
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Start with a button (optional)</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => applyTemplate("write")}>
            Write something
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => applyTemplate("summarize")}>
            Summarize
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => applyTemplate("extract")}>
            Extract to JSON
          </button>
        </div>
        <div className="mt-2 text-xs opacity-70">
          Fill the boxes below. The JSON and Clean Prompt update automatically.
        </div>
      </div>

      <BoxesEditor doc={doc} onChange={setDoc} />
    </div>
  );
}
