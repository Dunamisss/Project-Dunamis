import type { PromptDoc } from "../types.js";

export function toCleanPrompt(doc: PromptDoc): string {
  const lines: string[] = [];

  if (doc.goal.trim()) lines.push(`Goal: ${doc.goal.trim()}`);
  if (doc.audience.trim()) lines.push(`Audience: ${doc.audience.trim()}`);

  if (doc.inputs.length) {
    lines.push("Use this info:");
    for (const i of doc.inputs) {
      const label = i.name?.trim() ? i.name.trim() : i.type.toUpperCase();
      const val = i.value?.trim() ?? "";
      lines.push(`- ${label}: ${val}`);
    }
  }

  if (doc.constraints.length) {
    lines.push("Constraints:");
    for (const c of doc.constraints) lines.push(`- ${c}`);
  }

  const styleBits: string[] = [];
  if (doc.style.tone) styleBits.push(`tone=${doc.style.tone}`);
  if (doc.style.voice) styleBits.push(`voice=${doc.style.voice}`);
  if (doc.style.length) styleBits.push(`length=${doc.style.length}`);
  if (doc.style.reading_level) styleBits.push(`reading_level=${doc.style.reading_level}`);
  if (styleBits.length) lines.push(`Style: ${styleBits.join(", ")}`);

  lines.push(`Output format: ${doc.output.format}`);

  if (doc.output.schema) {
    lines.push("Output schema (if possible):");
    lines.push(JSON.stringify(doc.output.schema, null, 2));
  }

  if (doc.examples.length) {
    lines.push("Examples:");
    for (const ex of doc.examples) {
      if (ex.input.trim()) lines.push(`Input: ${ex.input.trim()}`);
      if (ex.output.trim()) lines.push(`Output: ${ex.output.trim()}`);
      lines.push("---");
    }
  }

  if (doc.notes.trim()) lines.push(`Notes: ${doc.notes.trim()}`);

  // Make it “prompt-friendly”
  return lines.join("\n");
}
