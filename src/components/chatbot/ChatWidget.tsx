import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Maximize2, Minimize2, Trash2, Send, Bot } from "lucide-react";
import { useWebLLM } from "@/hooks/use-web-llm";
import { useChat } from "@/contexts/ChatContext";
import { ModelSelector } from "./ModelSelector";
import { InstructionsModal } from "./InstructionsModal";
import { ChatWindow } from "./ChatWindow";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const { 
    loadModel, 
    sendMessage, 
    clearChat, 
    messages, 
    isLoading, 
    progress, 
    currentModel, 
    isGenerating,
    isModelLoaded,
    setSystemPrompt
  } = useWebLLM();
  const { promptToLoad, clearPromptToLoad, modelToLoad, clearModelToLoad } = useChat();
  
  const [input, setInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingAutoMessageRef = useRef<string | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
    // keep focus on the input after sending
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Focus input when model is ready
  useEffect(() => {
    if (isModelLoaded && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isModelLoaded]);

  // Load prompt into system context when user clicks "Try Me"
  useEffect(() => {
    if (!promptToLoad) return;
    setSystemPrompt(promptToLoad);
    setInput("");
    clearPromptToLoad();
    // Queue a starter message so the model responds without showing the prompt.
    pendingAutoMessageRef.current = "Begin.";
    // Scroll input into view
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }, [promptToLoad, clearPromptToLoad, setSystemPrompt]);

  // Auto-send starter message once the model is loaded and system prompt is set.
  useEffect(() => {
    if (!isModelLoaded) return;
    const pending = pendingAutoMessageRef.current;
    if (!pending) return;
    // Send after system prompt is available in state.
    setTimeout(() => {
      sendMessage(pending);
      pendingAutoMessageRef.current = null;
    }, 0);
  }, [isModelLoaded, sendMessage]);

  // Load model when requested from context
  useEffect(() => {
    if (modelToLoad) {
      // request load
      loadModel(modelToLoad);
      clearModelToLoad();
    }
  }, [modelToLoad, loadModel, clearModelToLoad]);

  // Keep input focused whenever messages change (prevents losing visible focus)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages.length, isGenerating]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isFullscreen]);

  return (
    <Card className={cn(
      "flex flex-col border-primary/30 shadow-2xl shadow-primary/10 overflow-hidden transition-all duration-300",
      "bg-black/80 backdrop-blur-md",
      isFullscreen ? "fixed top-16 left-0 right-0 bottom-0 z-[9999] w-screen rounded-none m-0 bg-black" : "w-full max-w-4xl h-[700px] rounded-xl"
    )}>
      {/* Header */}
      <div className="flex flex-col border-b border-primary/20 bg-background/50 p-4 gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
                    <Bot className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold font-display text-primary tracking-wide">DUNAMIS AI</h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Free In-Browser Intelligence</p>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
              <InstructionsModal />
                
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Clear Chat"
              >
                <Trash2 className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
        </div>
        
        {/* Model Selector Bar */}
        <div className="flex items-center justify-between bg-card/50 p-2 rounded-lg border border-primary/10">
            <ModelSelector 
                currentModel={currentModel} 
                onLoadModel={loadModel} 
                isLoading={isLoading} 
                progress={progress} 
            />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-black/40">
        <ChatWindow messages={messages} isGenerating={isGenerating} />
        
        {/* Overlay for not loaded state */}
        {!isModelLoaded && !isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 backdrop-blur-sm">
                <div className="text-center p-6 max-w-md">
                    <h2 className="text-2xl font-display text-primary mb-2">Select a Model to Begin</h2>
                    <p className="text-muted-foreground">
                        Choose a model from the dropdown above and click "Load". 
                        The AI runs entirely in your browser—private, free, and secure.
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 border-t border-primary/20">
        <div className="relative flex items-end gap-2">
            <Textarea 
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isModelLoaded ? "Type your message here..." : "Load a model first..."}
                disabled={!isModelLoaded || isGenerating}
                className="min-h-[60px] max-h-[150px] resize-none pr-12 bg-card border-primary/30 focus:border-primary text-foreground placeholder:text-muted-foreground/50 rounded-lg shadow-inner"
            />
            <Button 
                onClick={handleSend} 
                disabled={!isModelLoaded || !input.trim() || isGenerating}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                Powered by WebLLM & MLC AI
            </p>
        </div>
      </div>
    </Card>
  );
}
