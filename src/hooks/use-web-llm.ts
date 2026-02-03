import { useState, useCallback } from "react";
import { CreateMLCEngine, MLCEngine, type InitProgressReport, type MLCEngineConfig } from "@mlc-ai/web-llm";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function useWebLLM() {
  const [engine, setEngine] = useState<MLCEngine | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize engine
  const loadModel = useCallback(async (modelId: string) => {
    setIsLoading(true);
    setProgress("Initializing engine...");
    try {
      const initProgressCallback = (report: InitProgressReport) => {
        setProgress(report.text);
      };
      
      // If engine exists, reload. If not, create.
      let newEngine = engine;
      if (!newEngine) {
        newEngine = await CreateMLCEngine(modelId, { initProgressCallback } as any);
        setEngine(newEngine);
      } else {
        await newEngine.reload(modelId, { initProgressCallback } as any);
      }
      
      setCurrentModel(modelId);
      setProgress("Ready");
    } catch (error) {
      console.error("Failed to load model:", error);
      setProgress("Error loading model: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  const sendMessage = useCallback(async (text: string) => {
    if (!engine || !text.trim() || isGenerating) return;

    const newMsg: Message = { role: "user", content: text };
    // Optimistic update
    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const chunks = await engine.chat.completions.create({
        messages: newMessages,
        stream: true,
      });

      let assistantMessage = "";
      // Add placeholder for assistant
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta.content || "";
        assistantMessage += delta;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last.role !== "assistant") return prev; // Should not happen
          return [...prev.slice(0, -1), { ...last, content: assistantMessage }];
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Optional: Add error message to chat
    } finally {
      setIsGenerating(false);
    }
  }, [engine, messages, isGenerating]);
  
  const clearChat = useCallback(async () => {
    setMessages([]);
    if (engine) {
        await engine.resetChat();
    }
  }, [engine]);

  return {
    loadModel,
    sendMessage,
    clearChat,
    messages,
    isLoading,
    progress,
    currentModel,
    isGenerating,
    isModelLoaded: !!engine && !isLoading && !!currentModel
  };
}
