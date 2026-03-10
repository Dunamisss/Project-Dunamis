import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { app } from "../lib/firebase";

const functions = getFunctions(app);

export interface HistoryItem {
  id: string;
  mode: "optimizer" | "json-architect" | "toy-figure";
  input: string;
  result: any;
  createdAt: number;
}


interface ChatContextType {
  promptToLoad: string | null;
  loadPrompt: (prompt: string) => void;
  clearPromptToLoad: () => void;
  // New: allow pages to request a model load and open the chat
  modelToLoad: string | null;
  loadModelById: (modelId: string) => void;
  clearModelToLoad: () => void;
  // Control chat UI
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  // History and cloud functions
  history: HistoryItem[];
  addToHistory: (item: HistoryItem) => void;
  callCloudFunction: (functionName: string, data: Record<string, unknown>) => Promise<unknown>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [promptToLoad, setPromptToLoad] = useState<string | null>(null);
  const [modelToLoad, setModelToLoad] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadPrompt = useCallback((prompt: string) => {
    setPromptToLoad(prompt);
  }, []);

  const clearPromptToLoad = useCallback(() => {                                                                                                                             
    setPromptToLoad(null);
  }, []);

  const loadModelById = useCallback((modelId: string) => {
    setModelToLoad(modelId);
  }, []);

  const clearModelToLoad = useCallback(() => {
    setModelToLoad(null);
  }, []);

  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  }, []);

  const callCloudFunction = useCallback(async (functionName: string, data: Record<string, unknown>) => {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
  }, []);

  return (
    <ChatContext.Provider value={{
      promptToLoad,
      loadPrompt,
      clearPromptToLoad,
      modelToLoad,
      loadModelById,
      clearModelToLoad,
      chatOpen,
      openChat,
      closeChat,
      history,
      addToHistory,
      callCloudFunction,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
