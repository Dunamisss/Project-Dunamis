import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/contexts/ChatContext";
import {
  ArrowLeftRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ListChecks,
  Search,
  Sparkles,
  StepForward,
  Target,
  Users,
  Workflow,
} from "lucide-react";

const FRAMEWORKS = [
  {
    id: "role-prompting",
    title: "Role Prompting",
    summary: "Define the AI’s role, objective, and constraints upfront for sharper output.",
    tags: ["clarity", "tone", "professional"],
    icon: Users,
    template:
      "You are a [specific role].\nYour task is to [clear objective].\nConstraints: [rules, limits, tone].",
    sections: [
      {
        heading: "What Role Prompting Is",
        body:
          "Role prompting is the practice of explicitly assigning the AI a role before giving it a task. The role defines expertise, mindset, tone, and boundaries. Without a role, the AI defaults to generic responses.",
      },
      {
        heading: "Why Role Prompting Works",
        body:
          "It narrows the response space, improves accuracy and tone, and reduces vague or surface-level answers.",
      },
      {
        heading: "Core Structure",
        body:
          "You are a [specific role].\nYour task is to [clear objective].\nConstraints: [rules, limits, tone].",
      },
      {
        heading: "Example",
        body:
          "You are an experienced Python tutor for absolute beginners.\nExplain loops using simple language and short examples.\nDo not assume prior programming knowledge.",
      },
      {
        heading: "When to Use Role Prompting",
        body:
          "Teaching and tutorials, technical explanations, professional writing, and style-sensitive tasks.",
      },
      {
        heading: "When Not to Use It",
        body: "Simple factual questions and one-word or one-line answers.",
      },
    ],
  },
  {
    id: "5w1h-prompting",
    title: "5W1H Prompting",
    summary: "Force completeness by answering Who, What, When, Where, Why, and How.",
    tags: ["completeness", "planning", "documentation"],
    icon: ListChecks,
    template:
      "Goal:\nWho:\nWhat:\nWhen:\nWhere:\nWhy:\nHow:\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What 5W1H Is",
        body:
          "5W1H stands for Who, What, When, Where, Why, and How. It is a completeness framework used to eliminate missing context.",
      },
      {
        heading: "Why It Works",
        body:
          "Most bad prompts fail because they are incomplete. This framework forces clarity before execution.",
      },
      {
        heading: "How to Apply 5W1H",
        body:
          "Answer as many of the following as possible before writing the prompt:\n- Who is this for?\n- What do I want?\n- Why does this exist?\n- How should it be done?\n- Where will it be used?\n- When does it apply?",
      },
      {
        heading: "Example",
        body:
          "Who: Beginner programmers\nWhat: A tutorial on Python lists\nWhy: Lists are confusing at first\nHow: Step-by-step with examples",
      },
      {
        heading: "Best Use Cases",
        body: "Planning prompts, instructional content, documentation, and guides.",
      },
    ],
  },
  {
    id: "star-prompting",
    title: "STAR Prompting",
    summary: "Structure answers around Situation, Task, Action, Result for clear outcomes.",
    tags: ["case-study", "results", "retrospective"],
    icon: Target,
    template:
      "Situation:\nTask:\nAction:\nResult:\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What STAR Is",
        body:
          "STAR stands for Situation, Task, Action, and Result. It is used to structure explanations around cause and effect.",
      },
      {
        heading: "Why STAR Works",
        body: "It keeps answers grounded, prevents rambling, and makes outcomes clear.",
      },
      {
        heading: "STAR Structure",
        body:
          "Situation: Context\nTask: Goal or problem\nAction: What was done\nResult: Outcome",
      },
      {
        heading: "Example",
        body:
          "Situation: AI responses were inconsistent.\nTask: Improve output quality.\nAction: Added role prompting and constraints.\nResult: Outputs became reliable.",
      },
      {
        heading: "When to Use STAR",
        body: "Case studies, retrospectives, and explanations with outcomes.",
      },
    ],
  },
  {
    id: "beforeafterbridge-prompting",
    title: "Before–After–Bridge Prompting",
    summary: "Contrast the problem and the desired state, then show the bridge.",
    tags: ["persuasion", "clarity", "process"],
    icon: ArrowLeftRight,
    template:
      "Before (current state):\nAfter (desired state):\nBridge (steps to get there):\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What Before–After–Bridge Is",
        body:
          "Before–After–Bridge is a clarity and persuasion framework. It shows the problem, the improvement, and the method that connects them.",
      },
      {
        heading: "Framework Structure",
        body:
          "Before: The current problem\nAfter: The desired state\nBridge: The method to get there",
      },
      {
        heading: "Example",
        body:
          "Before: Prompts give generic answers.\nAfter: Prompts produce precise results.\nBridge: Add roles, constraints, and examples.",
      },
      {
        heading: "Why It Works",
        body: "It creates contrast, makes improvement obvious, and guides understanding logically.",
      },
      {
        heading: "Best Use Cases",
        body: "Tutorials, persuasive explanations, and process improvement documentation.",
      },
    ],
  },
  {
    id: "ipo-prompting",
    title: "Input–Process–Output Prompting",
    summary: "Define inputs, transformation steps, and exact output shape.",
    tags: ["systems", "automation", "repeatable"],
    icon: Workflow,
    template:
      "Input:\nProcess:\nOutput:\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What Input–Process–Output Is",
        body:
          "Input–Process–Output (IPO) is a systems-based framework that defines expectations clearly.",
      },
      {
        heading: "Why IPO Works",
        body:
          "It removes ambiguity by explicitly stating what you provide, what the AI should do, and what you expect back.",
      },
      {
        heading: "IPO Structure",
        body:
          "Input: Provided information\nProcess: Instructions or transformation\nOutput: Expected result",
      },
      {
        heading: "Example",
        body:
          "Input: A rough outline\nProcess: Expand into a tutorial\nOutput: Markdown document with examples",
      },
      {
        heading: "When to Use IPO",
        body: "Automation tasks, repeatable workflows, and technical prompts.",
      },
    ],
  },
  {
    id: "zero-shot-prompting",
    title: "Zero-Shot Prompting",
    summary: "Fast, minimal instruction when you just need an answer now.",
    tags: ["fast", "exploration"],
    icon: Sparkles,
    template:
      "Task:\nContext:\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What Zero-Shot Prompting Is",
        body:
          "Zero-shot prompting means asking the AI to perform a task without providing examples.",
      },
      {
        heading: "Example",
        body: "Explain recursion in simple terms.",
      },
      {
        heading: "Advantages",
        body: "Fast and minimal setup.",
      },
      {
        heading: "Limitations",
        body: "Inconsistent quality and heavily dependent on model defaults.",
      },
      {
        heading: "When to Use Zero-Shot",
        body: "Brainstorming, exploration, and quick answers.",
      },
    ],
  },
  {
    id: "few-shot-prompting",
    title: "Few-Shot Prompting",
    summary: "Provide examples to lock style and consistency.",
    tags: ["examples", "style", "consistency"],
    icon: BookOpen,
    template:
      "Task:\nContext:\nExamples:\n- Example 1:\n- Example 2:\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What Few-Shot Prompting Is",
        body:
          "Few-shot prompting provides examples so the AI can infer the desired pattern.",
      },
      {
        heading: "Why Few-Shot Works",
        body: "Examples reduce ambiguity and improve consistency.",
      },
      {
        heading: "Few-Shot Structure",
        body:
          "Example 1: Input → Output\nExample 2: Input → Output\nNew task: Apply the same pattern",
      },
      {
        heading: "Example",
        body:
          "Input: Fix grammar\nOutput: Corrected sentence\n\nInput: Summarize text\nOutput: Bullet summary\n\nNow rewrite the following paragraph clearly.",
      },
      {
        heading: "Best Use Cases",
        body: "Formatting tasks, style matching, and repetitive outputs.",
      },
    ],
  },
  {
    id: "step-by-step-prompting",
    title: "Step-by-Step Prompting",
    summary: "Ask for explicit steps to improve logic and accuracy.",
    tags: ["logic", "planning", "coding"],
    icon: StepForward,
    template:
      "Task:\nSteps:\n1.\n2.\n3.\nConstraints:\nOutput format:",
    sections: [
      {
        heading: "What Step-by-Step Prompting Is",
        body:
          "Step-by-step prompting explicitly instructs the AI to reason in stages.",
      },
      {
        heading: "Why It Works",
        body: "It prevents shallow answers and improves accuracy and logic.",
      },
      {
        heading: "Basic Example",
        body:
          "Solve this step by step.\nExplain each decision before moving on.",
      },
      {
        heading: "Advanced Variant",
        body:
          "Break the problem into steps.\nVerify each step before continuing.",
      },
      {
        heading: "When to Use It",
        body: "Coding, planning, logic-heavy problems, and complex reasoning.",
      },
    ],
  },
];

export default function Frameworks() {
  const [, setLocation] = useLocation();
  const { loadPrompt } = useChat();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    FRAMEWORKS.forEach((framework) => framework.tags.forEach((tag) => tags.add(tag)));
    return ["all", ...Array.from(tags).sort()];
  }, []);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return FRAMEWORKS.filter((framework) => {
      const matchesQuery =
        !trimmed ||
        framework.title.toLowerCase().includes(trimmed) ||
        framework.summary.toLowerCase().includes(trimmed) ||
        framework.sections.some((section) => section.body.toLowerCase().includes(trimmed));
      const matchesTag = activeTag === "all" || framework.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [query, activeTag]);

  const handleCopy = async (template: string) => {
    try {
      await navigator.clipboard.writeText(template);
      setCopyFeedback("Template copied.");
    } catch {
      setCopyFeedback("Copy failed. Select and copy manually.");
    }
    window.setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleUse = (template: string) => {
    loadPrompt(template);
    setLocation("/");
  };

  return (
    <div id="top" className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-12 max-w-5xl mx-auto space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">
              Practical Prompting Frameworks
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              A clean, professional reference for prompt structures that produce clearer, more reliable outputs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        <section className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-5">
          <div className="flex items-center gap-3 text-yellow-200">
            <Bot className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Which framework should I use?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-yellow-200">Need clarity fast</h3>
              <p>Use Role Prompting or 5W1H to remove missing context.</p>
            </div>
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-yellow-200">Need consistent outputs</h3>
              <p>Use Few‑Shot with 1–2 examples to lock tone and format.</p>
            </div>
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-yellow-200">Need reliable reasoning</h3>
              <p>Use Step‑by‑Step or STAR for structure and outcomes.</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-yellow-200">Table of Contents</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
            {FRAMEWORKS.map((framework) => (
              <a
                key={framework.id}
                href={`#${framework.id}`}
                className="rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2 hover:border-yellow-400/50 hover:text-yellow-200 transition"
              >
                {framework.title}
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-yellow-200">Find a framework</h2>
              <p className="text-xs text-gray-400">
                Search by purpose, keywords, or content. Use tags to filter quickly.
              </p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-200/70" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9 bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-400"
                placeholder="Search frameworks..."
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={[
                  "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] transition",
                  activeTag === tag
                    ? "border-yellow-400/60 text-yellow-200 bg-yellow-500/10"
                    : "border-yellow-500/20 text-gray-300 hover:text-yellow-200 hover:border-yellow-400/50",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          {filtered.map((framework) => {
            const Icon = framework.icon;
            return (
            <section
              key={framework.id}
              id={framework.id}
              className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border border-yellow-500/30 bg-black/50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-yellow-200" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-yellow-200">{framework.title}</h2>
                    <p className="text-xs text-gray-400">{framework.summary}</p>
                  </div>
                </div>
                <a href="#top" className="text-xs text-yellow-200/70 hover:text-yellow-200">
                  Back to top
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {framework.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-yellow-500/20 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-yellow-200/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.25em]">Template</p>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-line">{framework.template}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => handleCopy(framework.template)}
                  >
                    Copy Template
                  </Button>
                  <Button
                    className="bg-yellow-400 text-black hover:bg-yellow-300"
                    onClick={() => handleUse(framework.template)}
                  >
                    Use in Optimizer
                  </Button>
                </div>
              </div>
              <div className="space-y-4 text-sm text-gray-200">
                {framework.sections.map((section, index) => (
                  <div key={`${framework.id}-${index}`} className="space-y-2">
                    <h3 className="text-sm font-semibold text-yellow-200">{section.heading}</h3>
                    <p className="whitespace-pre-line text-gray-300">{section.body}</p>
                  </div>
                ))}
              </div>
            </section>
            );
          })}
        </div>
        {copyFeedback && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-yellow-500/40 bg-black/90 px-4 py-2 text-[12px] text-yellow-200 shadow-lg">
            {copyFeedback}
          </div>
        )}
      </div>
    </div>
  );
}
