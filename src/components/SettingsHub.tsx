import { useState, useEffect } from "react";
import { Settings, Server, Cloud, ExternalLink, Check, Save, Zap, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsHub() {
  const [open, setOpen] = useState(false);
  
  // Connection Settings
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [grokKey, setGrokKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");

  // Model Settings
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const [grokModel, setGrokModel] = useState("grok-1");
  const [geminiModel, setGeminiModel] = useState("gemini-pro");

  // Active Provider
  const [activeProvider, setActiveProvider] = useState("ollama");

  // Load saved settings
  useEffect(() => {
    setOllamaUrl(localStorage.getItem("ollama_url") || "http://localhost:11434");
    setGrokKey(localStorage.getItem("grok_key") || "");
    setGeminiKey(localStorage.getItem("gemini_key") || "");
    
    setOllamaModel(localStorage.getItem("ollama_model") || "llama3");
    setGrokModel(localStorage.getItem("grok_model") || "grok-1");
    setGeminiModel(localStorage.getItem("gemini_model") || "gemini-pro");
    
    setActiveProvider(localStorage.getItem("active_provider") || "ollama");
  }, []);

  const handleSave = () => {
    localStorage.setItem("ollama_url", ollamaUrl);
    localStorage.setItem("grok_key", grokKey);
    localStorage.setItem("gemini_key", geminiKey);
    
    localStorage.setItem("ollama_model", ollamaModel);
    localStorage.setItem("grok_model", grokModel);
    localStorage.setItem("gemini_model", geminiModel);
    
    localStorage.setItem("active_provider", activeProvider);

    toast.success("Engine configuration saved", {
      description: `Active Engine: ${activeProvider.toUpperCase()}`
    });
    window.dispatchEvent(new Event("settings-changed"));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary transition-colors">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[85vh] bg-card border-white/10 flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-white/5">
          <DialogTitle className="font-display text-2xl text-primary flex items-center gap-2">
            <Settings className="h-5 w-5" /> Engine Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your AI providers and select which engine to power the Playground.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Active Engine Selector */}
          <div className="px-6 py-4 bg-black/20 border-b border-white/5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Active Engine
            </Label>
            <RadioGroup 
              value={activeProvider} 
              onValueChange={setActiveProvider}
              className="grid grid-cols-3 gap-4"
            >
              <div className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer transition-all hover:bg-white/5 ${activeProvider === 'ollama' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20'}`}>
                <RadioGroupItem value="ollama" id="eng-ollama" className="sr-only" />
                <Label htmlFor="eng-ollama" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                  <Server className={`h-6 w-6 ${activeProvider === 'ollama' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${activeProvider === 'ollama' ? 'text-primary' : 'text-foreground'}`}>Local Ollama</span>
                </Label>
                {activeProvider === 'ollama' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>

              <div className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer transition-all hover:bg-white/5 ${activeProvider === 'grok' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20'}`}>
                <RadioGroupItem value="grok" id="eng-grok" className="sr-only" />
                <Label htmlFor="eng-grok" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                  <Zap className={`h-6 w-6 ${activeProvider === 'grok' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${activeProvider === 'grok' ? 'text-primary' : 'text-foreground'}`}>xAI Grok</span>
                </Label>
                {activeProvider === 'grok' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>

              <div className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer transition-all hover:bg-white/5 ${activeProvider === 'gemini' ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20'}`}>
                <RadioGroupItem value="gemini" id="eng-gemini" className="sr-only" />
                <Label htmlFor="eng-gemini" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                  <Cpu className={`h-6 w-6 ${activeProvider === 'gemini' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-semibold ${activeProvider === 'gemini' ? 'text-primary' : 'text-foreground'}`}>Google Gemini</span>
                </Label>
                {activeProvider === 'gemini' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
            </RadioGroup>
          </div>

          <Tabs defaultValue="ollama" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-4 border-b border-white/5">
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 gap-6">
                <TabsTrigger 
                  value="ollama" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none pb-3 pt-2"
                >
                  <Server className="mr-2 h-4 w-4" /> Connection Settings (Local)
                </TabsTrigger>
                <TabsTrigger 
                  value="cloud" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none pb-3 pt-2"
                >
                  <Cloud className="mr-2 h-4 w-4" /> Connection Settings (Cloud)
                </TabsTrigger>
              </TabsList>
            </div>

            {/* OLLAMA TAB */}
            <TabsContent value="ollama" className="flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-8">
                  {/* Configuration Field */}
                  <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-primary font-bold">Ollama URL</Label>
                        <Input 
                          value={ollamaUrl} 
                          onChange={(e) => setOllamaUrl(e.target.value)} 
                          className="bg-black/40 font-mono text-xs" 
                          placeholder="http://localhost:11434"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-primary font-bold">Model Name</Label>
                        <Input 
                          value={ollamaModel} 
                          onChange={(e) => setOllamaModel(e.target.value)} 
                          className="bg-black/40 font-mono text-xs" 
                          placeholder="e.g. llama3, mistral, deepseek-r1"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ensure your local Ollama server is running. Default URL: <span className="font-mono text-white/50">http://localhost:11434</span>
                    </p>
                  </div>

                  {/* Baby Steps Guide */}
                  <div className="space-y-4">
                    <h3 className="font-display text-xl text-foreground">Setup Guide</h3>
                    <div className="space-y-6 border-l-2 border-primary/20 pl-6 ml-2">
                      <Step number="1" title="Download" text="Get Ollama from the official site." link="https://ollama.com" />
                      <Step number="2" title="Install" text="Run the installer. It's safe and open-source." />
                      <Step number="3" title="Pull a Model" text="Run this in your terminal to get the Llama 3 model:">
                         <code className="block bg-black/40 p-2 rounded mt-2 text-primary font-mono text-sm">ollama run llama3</code>
                      </Step>
                      <Step number="4" title="Ready" text="Ollama is now serving on port 11434. You're ready to go!" />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CLOUD TAB */}
            <TabsContent value="cloud" className="flex-1 overflow-hidden p-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-8">
                  
                  {/* Grok Config */}
                  <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h4 className="font-bold text-white">xAI Grok</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input 
                          type="password"
                          value={grokKey} 
                          onChange={(e) => setGrokKey(e.target.value)} 
                          className="bg-black/40 font-mono text-xs" 
                          placeholder="xai-..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Model Name</Label>
                        <Input 
                          value={grokModel} 
                          onChange={(e) => setGrokModel(e.target.value)} 
                          className="bg-black/40 font-mono text-xs" 
                          placeholder="grok-1"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Get your key at <a href="https://console.x.ai" target="_blank" className="text-primary hover:underline">console.x.ai</a>
                    </div>
                  </div>

                  {/* Gemini Config */}
                  <div className="bg-black/20 p-5 rounded-lg border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <h4 className="font-bold text-white">Google Gemini</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input 
                          type="password"
                          value={geminiKey} 
                          onChange={(e) => setGeminiKey(e.target.value)} 
                          className="bg-black/40 font-mono text-xs" 
                          placeholder="AIza..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Model Name</Label>
                        <Input 
                          value={geminiModel} 
                          onChange={(e) => setGeminiModel(e.target.value)} 
                          className="bg-black/40 font-mono text-xs" 
                          placeholder="gemini-pro"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Get your key at <a href="https://aistudio.google.com" target="_blank" className="text-primary hover:underline">Google AI Studio</a>
                    </div>
                  </div>

                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-6 border-t border-white/5 bg-black/20">
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, title, text, link, children }: { number: string, title: string, text: string, link?: string, children?: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -left-[39px] top-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="text-base font-semibold text-white flex items-center gap-2">
          {title}
          {link && <a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-primary/50 hover:text-primary" /></a>}
        </h4>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{text}</p>
        {children}
      </div>
    </div>
  );
}
