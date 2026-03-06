import { describe, expect, it } from "vitest";
import { parsePromptHeuristicV2 } from "./heuristic2.js";

describe("parsePromptHeuristicV2", () => {
  it("extracts goal from Goal: header", () => {
    const r = parsePromptHeuristicV2("Goal: Write a cold email\nAudience: SaaS founders\nOutput: markdown");
    expect(r.data.goal.toLowerCase()).toContain("cold email");
    expect(r.field_confidence.goal).toBeGreaterThan(0.8);
  });

  it("detects json output", () => {
    const r = parsePromptHeuristicV2("Please extract contact info and return valid JSON.");
    expect(r.data.output.format).toBe("json");
  });

  it("extracts constraints from bullets", () => {
    const r = parsePromptHeuristicV2(`
Write a caption.
Constraints:
- No emojis
- Max 120 words
- Must include a CTA
`);
    expect(r.data.constraints.join(" ")).toMatch(/No emojis/i);
    expect(r.data.constraints.join(" ")).toMatch(/Max 120/i);
    expect(r.data.constraints.join(" ")).toMatch(/CTA/i);
  });

  it("detects urls as inputs", () => {
    const r = parsePromptHeuristicV2("Summarize https://example.com and output markdown.");
    expect(r.data.inputs.some((i) => i.type === "url")).toBe(true);
  });
});

