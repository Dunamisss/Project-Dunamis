import { Router } from "express";
import { z } from "zod";
import { parsePromptHeuristicV2 } from "./parse/heuristic2.js";
import { toCleanPrompt } from "./parse/cleanPrompt.js";
import type { PromptDoc } from "./types.js";

export const routes = Router();

const parseBody = z.object({
  source_prompt: z.string().default("")
});

routes.post("/parse", (req, res) => {
  const body = parseBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request" });

  const result = parsePromptHeuristicV2(body.data.source_prompt);
  return res.json(result);
});

const renderBody = z.object({
  doc: z.any()
});

routes.post("/render-clean-prompt", (req, res) => {
  const body = renderBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request" });

  // minimal trust: coerce fields a bit
  const doc = body.data.doc as PromptDoc;
  const clean = toCleanPrompt(doc);
  return res.json({ clean_prompt: clean });
});
