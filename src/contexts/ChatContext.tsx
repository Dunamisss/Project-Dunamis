import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [promptToLoad, setPromptToLoad] = useState<string | null>(null);
  const [modelToLoad, setModelToLoad] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

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
