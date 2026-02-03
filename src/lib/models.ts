export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  vram: string;
  strengths: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B",
    description: "Ultra-lightweight model by Meta. Fastest download and inference.",
    vram: "~880 MB",
    strengths: "Speed, low memory usage, basic chat"
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi 3.5 Mini",
    description: "Microsoft's highly capable small model.",
    vram: "~3.6 GB",
    strengths: "Reasoning, math, coding, balanced performance"
  },
  {
    id: "Gemma-2-2b-it-q4f16_1-MLC",
    name: "Gemma 2 2B",
    description: "Google's lightweight open model.",
    vram: "~1.9 GB",
    strengths: "Creative writing, general knowledge, efficiency"
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
    name: "Llama 3.1 8B",
    description: "The industry standard open model. Heavy but powerful.",
    vram: "~6.1 GB",
    strengths: "Complex reasoning, nuance, detailed answers"
  },
   {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B",
    description: "Alibaba's efficient model with strong multilingual support.",
    vram: "~1.6 GB",
    strengths: "Multilingual, coding, general tasks"
  }
];
