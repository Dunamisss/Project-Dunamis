import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";

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
    <AppShell
      eyebrow="Guides"
      title="Tutorials"
      description="Reference material for when you need a framework, a workflow reminder, or the right tool for the next step."
      actions={
        <>
          <Link href="/prompt-boxes">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Prompt Boxes
            </Button>
          </Link>
          <Link href="/prompt-repair">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Prompt Repair
            </Button>
          </Link>
          <Link href="/audit-json">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Audit + JSON
            </Button>
          </Link>
        </>
      }
    >
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">Frameworks</p>
          <p className="text-sm leading-6 text-zinc-300">Choose the structure that matches the kind of output you need.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">Workflows</p>
          <p className="text-sm leading-6 text-zinc-300">Use this page when you need process guidance, not another editor.</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">Next Step</p>
          <p className="text-sm leading-6 text-zinc-300">Once the structure is clear, move back into the active tools and build.</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-yellow-500/20 bg-black/55 p-6 shadow-[0_35px_110px_rgba(0,0,0,0.35)] space-y-8">
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
      </section>
    </AppShell>
  );
}
