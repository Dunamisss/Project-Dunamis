import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Zap, Lock, ChevronRight, ChevronLeft, ArrowRight, Settings, Terminal, Cloud, ToggleRight, Cpu, Server, AlertTriangle, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import TubesEffect from "@/components/TubesEffect";

const slides = [
  {
    id: "philosophy",
    title: "The Dunamis Philosophy",
    description: "The ecosystem is flooded with noise. Dunamis is built for precision—a secure environment to refine prompts before they ever touch production code.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.05)_0%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <ShieldCheck className="w-24 h-24 text-primary drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]" />
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <span className="font-mono text-xs text-primary/60 tracking-[0.3em] uppercase">Precision Engineered</span>
        </div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
      </div>
    )
  },
  {
    id: "playground",
    title: "The Playground Interface",
    description: "Your command center. Test prompts in real-time, monitor engine status, and iterate faster with our streamlined chat interface.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        {/* Mock Chat UI */}
        <div className="w-3/4 h-3/4 bg-black/60 border border-white/10 rounded-lg p-4 flex flex-col gap-3 shadow-2xl backdrop-blur-sm">
           <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-2 h-2 rounded-full bg-red-500/50" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <div className="w-2 h-2 rounded-full bg-green-500/50" />
              <div className="ml-auto w-16 h-1 rounded-full bg-white/10" />
           </div>
           <div className="flex-1 space-y-3 p-2">
              <div className="bg-white/5 rounded-lg p-2 w-3/4 self-start border border-white/5">
                <div className="h-2 w-1/2 bg-white/20 rounded mb-1" />
                <div className="h-2 w-3/4 bg-white/10 rounded" />
              </div>
              <div className="bg-primary/20 rounded-lg p-2 w-2/3 self-end ml-auto border border-primary/20">
                <div className="h-2 w-3/4 bg-primary/40 rounded mb-1" />
                <div className="h-2 w-1/2 bg-primary/30 rounded" />
              </div>
           </div>
           <div className="h-8 bg-white/5 rounded border border-white/10 w-full" />
        </div>
      </div>
    )
  },
  {
    id: "settings",
    title: "The Engine Room",
    description: "Access the Settings Hub to configure your AI backbone. Toggle between privacy-focused Local models and high-performance Cloud engines.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative">
          <Settings className="w-32 h-32 text-primary/80 drop-shadow-[0_0_30px_rgba(255,215,0,0.2)]" />
          <div className="absolute top-0 right-0 p-2 bg-black border border-primary/30 rounded-full transform translate-x-1/4 -translate-y-1/4">
            <Zap className="w-6 h-6 text-primary fill-primary" />
          </div>
        </div>
      </div>
    )
  },
  {
    id: "local",
    title: "Local Configuration",
    description: "Run offline with Ollama. Our 'Baby Steps' guide makes setup effortless—perfect for privacy-critical applications and cost-free testing.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <Server className="w-24 h-24 text-white/20" />
             <div className="absolute inset-0 flex items-center justify-center">
               <Terminal className="w-10 h-10 text-primary" />
             </div>
          </div>
          <div className="bg-black/50 px-4 py-2 rounded border border-white/10 font-mono text-xs text-primary/80">
            http://localhost:11434
          </div>
        </div>
      </div>
    )
  },
  {
    id: "cloud",
    title: "Cloud Power",
    description: "Need more reasoning power? Connect xAI Grok or Google Gemini instantly. Just drop in your API key and unleash the full potential.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        <div className="grid grid-cols-2 gap-8">
           <div className="flex flex-col items-center gap-2">
             <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
               <Zap className="w-8 h-8 text-white/80" />
             </div>
             <span className="text-xs font-mono text-muted-foreground">GROK</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
               <Cpu className="w-8 h-8 text-white/80" />
             </div>
             <span className="text-xs font-mono text-muted-foreground">GEMINI</span>
           </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent mix-blend-overlay" />
      </div>
    )
  },
  {
    id: "switch",
    title: "Seamless Switching",
    description: "Toggle engines on the fly. Compare how 'Llama 3' handles a prompt versus 'Grok-1' with a single click in the header.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
         <div className="flex items-center gap-8">
            <div className="text-center opacity-50 scale-90">
              <Server className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <div className="h-1 w-8 bg-muted-foreground/30 mx-auto rounded" />
            </div>
            
            <ToggleRight className="w-24 h-24 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" />
            
            <div className="text-center">
              <Cloud className="w-12 h-12 mx-auto mb-2 text-foreground" />
              <div className="h-1 w-8 bg-primary mx-auto rounded shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
            </div>
         </div>
      </div>
    )
  },
  {
    id: "troubleshoot",
    title: "Troubleshooting",
    description: "Having issues? If 'Local' fails, check Ollama is running. For 'Cloud', ensure API keys are valid and have credits. Toggle engines to reset connection.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,0,0,0.1)_0%,transparent_70%)]" />
        <div className="flex flex-col gap-4 w-3/4">
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="h-2 w-2/3 bg-red-500/20 rounded" />
          </div>
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg opacity-80">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="h-2 w-3/4 bg-yellow-500/20 rounded" />
          </div>
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-3 rounded-lg mt-2">
            <HelpCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div className="h-2 w-1/2 bg-green-500/20 rounded" />
          </div>
        </div>
      </div>
    )
  },
  {
    id: "join",
    title: "Start Building",
    description: "Stop guessing. Start engineering. Sign in now to access the full Dunamis Playground and secure prompt library.",
    visual: (
      <div className="relative w-full h-full flex items-center justify-center bg-black/40 overflow-hidden rounded-lg border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        <div className="text-center z-10">
          <AuthModal trigger={
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xl px-12 py-8 rounded-full shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)] transition-all hover:scale-105">
              Sign In to Access <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          } />
        </div>
      </div>
    )
  }
];

export default function NarrativeDeck() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    })
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrent((prev) => (prev + newDirection + slides.length) % slides.length);
  };

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      paginate(1);
    }, 15000); // 15 seconds per slide
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background Special Effect */}
      <TubesEffect className="opacity-40" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="relative h-[600px] w-full max-w-6xl mx-auto">
          {/* Controls */}
          <div className="absolute top-1/2 -left-4 md:-left-12 z-20 -translate-y-1/2">
            <Button variant="ghost" size="icon" onClick={() => paginate(-1)} className="rounded-full bg-black/50 border border-white/10 hover:bg-primary/20 backdrop-blur-md">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute top-1/2 -right-4 md:-right-12 z-20 -translate-y-1/2">
            <Button variant="ghost" size="icon" onClick={() => paginate(1)} className="rounded-full bg-black/50 border border-white/10 hover:bg-primary/20 backdrop-blur-md">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Progress Indicators */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > current ? 1 : -1);
                  setCurrent(index);
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === current ? "w-12 bg-primary" : "w-4 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0 grid md:grid-cols-2 gap-8 md:gap-16 items-center bg-card/30 backdrop-blur-sm border border-white/5 rounded-2xl p-8 md:p-16 shadow-2xl"
            >
              {/* Text Content */}
              <div className="order-2 md:order-1 space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-primary font-mono text-sm tracking-widest uppercase">
                    0{current + 1} / 0{slides.length}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6 leading-tight">
                    {slides[current].title}
                  </h2>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {slides[current].description}
                  </p>
                </motion.div>
                
                {slides[current].id !== "join" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button variant="link" className="text-primary p-0 h-auto font-medium hover:text-primary/80" onClick={() => paginate(1)}>
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Visual Content */}
              <div className="order-1 md:order-2 h-[300px] md:h-full w-full">
                {slides[current].visual}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
