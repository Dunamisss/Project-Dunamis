import { useState, useEffect } from "react";
import { Send, Lock, Sparkles, User, Bot, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { motion, AnimatePresence } from "framer-motion";
import SettingsHub from "@/components/SettingsHub";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function PromptPlayground() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Welcome to the Dunamis Playground. Configure your engine using the settings cog, or type below to test with our default simulator." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Engine State
  const [engineInfo, setEngineInfo] = useState("Default Simulator");

  const updateEngineInfo = () => {
    const provider = localStorage.getItem("active_provider") || "ollama";
    const model = localStorage.getItem(`${provider}_model`) || "default";
    const providerName = provider === "ollama" ? "Local" : provider === "grok" ? "xAI" : "Gemini";
    setEngineInfo(`${providerName} / ${model}`);
  };

  useEffect(() => {
    updateEngineInfo();
    const handleSettingsChange = () => updateEngineInfo();
    window.addEventListener("settings-changed", handleSettingsChange);
    return () => window.removeEventListener("settings-changed", handleSettingsChange);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Get current settings for the simulation
    const provider = localStorage.getItem("active_provider") || "ollama";
    const model = localStorage.getItem(`${provider}_model`) || "unknown";

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: `[${provider.toUpperCase()} : ${model}] This is a simulated response. The prompt was processed using the ${model} configuration.` 
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <section className="py-12 bg-background relative border-y border-white/5">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-2">Prompt Playground</h2>
          <p className="text-muted-foreground">Test the power of Dunamis before you deploy.</p>
        </div>

        <Card className="bg-black/40 border-white/10 backdrop-blur-md overflow-hidden relative min-h-[500px] flex flex-col">
          {/* Lock Overlay for Guests */}
          {!user && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-card border border-white/10 p-8 rounded-xl text-center max-w-md shadow-2xl">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-2">Restricted Access</h3>
                <p className="text-muted-foreground mb-6">
                  The Playground is reserved for registered members. Sign in to test prompts in real-time.
                </p>
                <AuthModal trigger={
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Sign In to Unlock
                  </Button>
                } />
              </div>
            </div>
          )}

          {/* Chat Interface */}
          <CardHeader className="border-b border-white/5 bg-white/5 py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="font-display text-sm font-medium tracking-wide leading-none">DUNAMIS ENGINE</span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{engineInfo}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SettingsHub />
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => setMessages([messages[0]])}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-grow p-0 relative">
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-white/5 border border-white/5 text-foreground"
                      }`}>
                        {msg.content}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t border-white/5 bg-black/20">
            <div className="flex gap-2">
              <Input 
                placeholder="Type your test message..." 
                className="bg-black/40 border-white/10 focus:border-primary/50" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={!user}
              />
              <Button onClick={handleSend} disabled={!user || !input.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
