export type InputItem = {
  name: string;
  type: "text" | "url" | "file" | "other";
  value: string;
};

export type PromptDoc = {
  goal: string;
  audience: string;
  inputs: InputItem[];
  constraints: string[];
  style: {
    tone: string;
    voice: string;
    length: "short" | "medium" | "long";
    reading_level: string;
  };
  output: {
    format: "markdown" | "json" | "text" | "html" | "table";
    schema: unknown | null;
  };
  examples: Array<{ input: string; output: string }>;
  source_prompt: string;
  notes: string;
};

export type ParseResponse = {
  data: PromptDoc;
  missing_questions: string[];
  field_confidence: Record<string, number>;
};
