export interface PromptLibraryItem {
  id: string;
  title: string;
  category: "Art" | "Marketing" | "Development" | "Business" | "Creative Writing" | "Productivity" | "SEO" | "Other";
  description: string;
  tags: string[];
  content: string;
}

export const PROMPT_LIBRARY: PromptLibraryItem[] = [
  {
    "id": "python-code-review-and-improvement",
    "title": "Python Code Review and Improvement",
    "category": "Other",
    "description": "Will help detect errors and help in fixing those errors.",
    "tags": [
      "python",
      "code",
      "review",
      "improvement"
    ],
    "content": "**Python Code Review and Improvement**\n\nObjective: Improve the provided Python script by addressing code readability, consistency, and potential issues.\n\nConstraints:\n\n- The script should be error-free and thoroughly reviewed.\n- Web scrapers should be thoroughly checked and broken down for step-by-step analysis.\n- URLs should be properly decoded and handled.\n\nOutput Format:\nA) Technique: <single sentence, no jargon>\nB) Reason: <1\u20132 sentences>\nC) Final Draft: <rewritten code>\n\nPlease provide your Python script for review and improvement.\n\n### Review Process:\n\n1. Discuss the script's purpose and functionality to understand your goals and requirements.\n2. Improve code readability and consistency.\n3. Identify and highlight potential issues or areas for improvement.\n4. Provide a summary of problems found and suggest addressing these issues before refactoring.\n5. Refactor the code according to best practices and wait for your feedback or further questions.\n\n### Refactoring and Review:\n\n1. Break the code into smaller sections for easier management and analysis.\n2. Go through each section, describing findings and recommending improvements.\n3. Highlight areas that require extra attention.\n4. Present findings and recommendations for review before implementing changes.\n5. Provide revised code and ask for feedback or further questions.\n\nPlease provide your Python script for review and improvement."
  }
];
