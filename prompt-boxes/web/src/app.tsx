import { useEffect, useState } from "react";
import ModeToggle from "./components/ModeToggle";
import PasteMode from "./components/PasteMode";
import GuidedMode from "./components/GuidedMode";
import JsonPreview from "./components/JsonPreview";
import PromptPreview from "./components/PromptPreview";
import type { PromptDoc } from "./types";
import { renderCleanPrompt } from "./api";

function blankDoc(): PromptDoc {
  return {
    goal: "",
    audience: "",
    inputs: [],
    constraints: [],
    style: { tone: "neutral", voice: "", length: "medium", reading_level: "" },
    output: { format: "text", schema: null },
    examples: [],
    source_prompt: "",
    notes: ""
  };
}

export default function App() {
  const [mode, setMode] = useState<"guided" | "paste">("guided");
  const [doc, setDoc] = useState<PromptDoc>(blankDoc());
  const [tab, setTab] = useState<"json" | "prompt">("json");
  const [cleanPrompt, setCleanPrompt] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const t = await renderCleanPrompt(doc);
        setCleanPrompt(t);
      } catch {
        setCleanPrompt("");
      }
    })();
  }, [doc]);

  return (
    <div className="min-h-dvh bg-neutral-100">
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-bold">Prompt to Boxes to JSON</div>
            <div className="text-sm opacity-70">Beginners use Guided Mode. Messy prompts use Paste Mode.</div>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            {mode === "guided" ? (
              <GuidedMode doc={doc} setDoc={setDoc} />
            ) : (
              <PasteMode doc={doc} setDoc={setDoc} setCleanPrompt={setCleanPrompt} setActiveTab={setTab} />
            )}
          </div>

          <div className="space-y-4">
            <div className="inline-flex rounded-xl border bg-white p-1">
              <button
                className={`px-3 py-2 rounded-lg text-sm ${tab === "json" ? "bg-black text-white" : ""}`}
                onClick={() => setTab("json")}
              >
                JSON
              </button>
              <button
                className={`px-3 py-2 rounded-lg text-sm ${tab === "prompt" ? "bg-black text-white" : ""}`}
                onClick={() => setTab("prompt")}
              >
                Clean Prompt
              </button>
            </div>

            {tab === "json" ? <JsonPreview doc={doc} /> : <PromptPreview text={cleanPrompt} />}

            <div className="rounded-2xl border bg-white p-4 text-xs opacity-70">
              Tip: Paste Mode auto-fills boxes. Then tweak boxes for perfection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


