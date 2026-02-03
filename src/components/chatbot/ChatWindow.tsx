import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/use-web-llm";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatWindowProps {
  messages: Message[];
  isGenerating: boolean;
}

export function ChatWindow({ messages, isGenerating }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating]);

  return (
    <ScrollArea className="flex-1 p-4 h-full" ref={scrollRef}>
      <div className="flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center p-8 opacity-50">
            <Bot className="h-16 w-16 mb-4 text-primary/50" />
            <p className="text-lg font-display text-primary">Ready to chat.</p>
            <p className="text-sm">Load a model to begin.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
                <div 
                    key={idx} 
                    className={cn(
                        "flex gap-3 max-w-[85%]",
                        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                >
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-primary/20",
                        isUser ? "bg-primary text-primary-foreground" : "bg-card text-primary"
                    )}>
                        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </div>
                    
                    <div className={cn(
                        "rounded-lg p-3 text-sm shadow-md overflow-hidden",
                        isUser 
                            ? "bg-primary text-primary-foreground font-medium" 
                            : "bg-muted text-foreground border border-primary/10"
                    )}>
                         {isUser ? (
                             <div className="whitespace-pre-wrap">{msg.content}</div>
                         ) : (
                             <div className="prose prose-invert prose-sm max-w-none break-words">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                             </div>
                         )}
                    </div>
                </div>
            )
        })}
        
        {isGenerating && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
                 <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-card text-primary border border-primary/20">
                    <Bot className="h-5 w-5 animate-pulse" />
                </div>
                <div className="bg-muted text-foreground border border-primary/10 rounded-lg p-3 flex items-center">
                    <span className="animate-pulse">Thinking...</span>
                </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
