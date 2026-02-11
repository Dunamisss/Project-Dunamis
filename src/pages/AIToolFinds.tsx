import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type ToolEntry = {
  id: string;
  name: string;
  url: string;
  whatItDoes: string;
  bestFor: string;
  freeLimits: string;
  watchOut: string;
  dunamisTip: string;
  relatedPrompt: string;
};

const TOOL_ENTRIES: ToolEntry[] = [
  {
    id: "flux-kontext-pro",
    name: "Flux Kontext Pro",
    url: "https://imageeditor.online/ai-models/flux-kontext-pro",
    whatItDoes: "Quick AI image edits and style changes from text instructions.",
    bestFor: "Creators testing visual concepts fast.",
    freeLimits: "Usually daily credit limits and slower queues at busy times.",
    watchOut: "Vague prompts produce inconsistent results.",
    dunamisTip: "Use the optimizer first, then paste the improved prompt into Flux.",
    relatedPrompt: "reverse-engineer-image",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    url: "https://www.perplexity.ai/",
    whatItDoes: "AI search assistant with cited web results.",
    bestFor: "Quick research and source discovery.",
    freeLimits: "Limited advanced model usage on free tier.",
    watchOut: "Verify cited sources before publishing important claims.",
    dunamisTip: "Use a Dunamis prompt template to structure your research questions.",
    relatedPrompt: "80-20-method",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    whatItDoes: "General-purpose AI for writing, coding, planning, and analysis.",
    bestFor: "Everyday prompt workflows.",
    freeLimits: "Model access and message caps can vary.",
    watchOut: "Outputs improve a lot with clear constraints and format requests.",
    dunamisTip: "Draft in Dunamis, then run final prompt in ChatGPT.",
    relatedPrompt: "suno-v5",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    url: "https://gemini.google.com/",
    whatItDoes: "AI assistant for reasoning, writing, and multimodal tasks.",
    bestFor: "Fast idea generation and summaries.",
    freeLimits: "Feature and model access depends on account tier.",
    watchOut: "Large tasks still need explicit output structure.",
    dunamisTip: "Use Dunamis framework templates before sending to Gemini.",
    relatedPrompt: "github-search-script",
  },
  {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai/",
    whatItDoes: "Strong long-form writing and structured analysis assistant.",
    bestFor: "Documents, strategy notes, and polished writing.",
    freeLimits: "Free usage windows and rate limits apply.",
    watchOut: "May stay too general unless you request strict output sections.",
    dunamisTip: "Use an audit-style prompt from Dunamis to force clearer output.",
    relatedPrompt: "prompt-revealer",
  },
];

export default function AIToolFinds() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">AI Tool Finds</h1>
            <p className="text-sm text-gray-300 max-w-3xl">
              Curated free/low-cost AI tools we test, plus how to pair each one with Dunamis prompts.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TOOL_ENTRIES.map((tool) => (
            <div key={tool.id} className="rounded-lg border border-yellow-500/20 bg-black/60 p-5 shadow-lg space-y-3">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-yellow-100">{tool.name}</h2>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-yellow-300 underline underline-offset-4 break-all"
                >
                  {tool.url}
                </a>
              </div>
              <p className="text-sm text-gray-300"><span className="text-yellow-200">What it does:</span> {tool.whatItDoes}</p>
              <p className="text-sm text-gray-300"><span className="text-yellow-200">Best for:</span> {tool.bestFor}</p>
              <p className="text-sm text-gray-300"><span className="text-yellow-200">Free limits:</span> {tool.freeLimits}</p>
              <p className="text-sm text-gray-300"><span className="text-yellow-200">Watch out:</span> {tool.watchOut}</p>
              <p className="text-sm text-gray-300"><span className="text-yellow-200">Use with Dunamis:</span> {tool.dunamisTip}</p>
              <div className="pt-2">
                <Link href={`/prompt/${tool.relatedPrompt}`}>
                  <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                    Related Prompt
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

