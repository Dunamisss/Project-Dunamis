import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const FRAMEWORKS = [
  {
    id: "role-prompting",
    title: "Role Prompting",
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

        <div className="space-y-8">
          {FRAMEWORKS.map((framework) => (
            <section
              key={framework.id}
              id={framework.id}
              className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-yellow-200">{framework.title}</h2>
                <a href="#top" className="text-xs text-yellow-200/70 hover:text-yellow-200">
                  Back to top
                </a>
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
          ))}
        </div>
      </div>
    </div>
  );
}
