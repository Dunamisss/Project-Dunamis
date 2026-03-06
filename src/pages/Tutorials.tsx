import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const FRAMEWORKS = [
  {
    id: "general",
    title: "General Prompt Framework",
    description:
      "Best for everyday writing and reasoning tasks. Produces ROLE, OBJECTIVE, CONTEXT, STEPS, and CONSTRAINTS.",
    whenToUse:
      "Use when you want clear, reusable prompts for ChatGPT, Gemini, Claude, or Perplexity.",
  },
  {
    id: "json",
    title: "JSON Architect Framework",
    description:
      "Best for structured outputs that must be machine-friendly and easy to reuse in automations.",
    whenToUse:
      "Use when your workflow expects strict keys, fixed output contracts, and no filler text.",
  },
  {
    id: "image",
    title: "Image Prompt Framework",
    description:
      "Builds visual prompt structures with subject, style, lighting, composition, and negative prompt controls.",
    whenToUse:
      "Use for Midjourney-style thinking, photoreal scenes, thumbnails, product shots, and creative direction.",
  },
  {
    id: "ad-copy",
    title: "Ad Copy Framework",
    description:
      "Creates conversion-focused structures with headline, hook, body, offer, and CTA.",
    whenToUse:
      "Use for marketing drafts, landing copy, social ads, and direct-response testing.",
  },
];

const JSON_FLOW_STEPS = [
  "Pick a JSON card in the Home Optimizer.",
  "Fill the field boxes.",
  "Build JSON Prompt to generate a strict payload.",
  "Click Make My Prompt Better or use Try in ChatGPT directly.",
  "Attach images manually inside your chosen AI tool when required.",
];

export default function Tutorials() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
        <header className="rounded-xl border border-yellow-500/30 bg-black/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">Tutorials</p>
              <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Frameworks And JSON Workflows</h1>
              <p className="text-sm text-gray-300 max-w-3xl">
                This page holds framework guidance so the homepage stays focused on building and running prompts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Back Home
                </Button>
              </Link>
              <Link href="/prompt-boxes">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Prompt Boxes
                </Button>
              </Link>
              <Link href="/prompt-repair">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Prompt Repair
                </Button>
              </Link>
              <Link href="/audit-json">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Audit + JSON
                </Button>
              </Link>
              <Link href="/optimizer">
                <Button className="bg-yellow-400 text-black hover:bg-yellow-300">
                  Open Optimizer
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-yellow-500/30 bg-black/70 p-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-yellow-200">When To Use Prompt Boxes Lab</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4">
              <p className="text-sm font-semibold text-yellow-100">Messy Prompt In</p>
              <p className="text-sm text-gray-300">Paste rough prompts with mixed notes, roles, visual cues, or negative prompts and split them into editable fields.</p>
            </div>
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4">
              <p className="text-sm font-semibold text-yellow-100">Review Missing Gaps</p>
              <p className="text-sm text-gray-300">The page flags missing core fields so you can tighten the structure before exporting or sending anything to a model.</p>
            </div>
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4">
              <p className="text-sm font-semibold text-yellow-100">Export Clean JSON</p>
              <p className="text-sm text-gray-300">Use it when the homepage cards are too rigid and you need a cleanup stage before the normal workflow.</p>
            </div>
          </div>
          <Link href="/prompt-boxes">
            <Button className="bg-yellow-400 text-black hover:bg-yellow-300">Open Prompt Boxes Lab</Button>
          </Link>
        </section>

        <section className="rounded-xl border border-yellow-500/30 bg-black/70 p-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-yellow-200">Framework Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FRAMEWORKS.map((framework) => (
              <article key={framework.id} className="rounded-lg border border-yellow-500/20 bg-black/40 p-4 space-y-2">
                <h3 className="text-lg font-semibold text-yellow-100">{framework.title}</h3>
                <p className="text-sm text-gray-300">{framework.description}</p>
                <p className="text-sm text-gray-400">{framework.whenToUse}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-yellow-500/30 bg-black/70 p-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-yellow-200">JSON Box Workflow</h2>
          <p className="text-sm text-gray-300">
            This follows the prompts.chat style approach: fill fields first, generate the prompt payload, then run it in the AI tool of your choice.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {JSON_FLOW_STEPS.map((step, index) => (
              <div key={`${index}-${step}`} className="rounded-md border border-yellow-500/20 bg-black/40 p-3">
                <p className="text-sm text-gray-200">{`${index + 1}. ${step}`}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Browsers cannot force-paste into external sites. Dunamis copies your prompt to clipboard and opens the target provider in a new tab.
          </p>
        </section>
      </div>
    </div>
  );
}
