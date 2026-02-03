import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Check } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  currentModel: string | null;
  onLoadModel: (modelId: string) => void;
  isLoading: boolean;
  progress: string;
}

export function ModelSelector({ currentModel, onLoadModel, isLoading, progress }: ModelSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(AVAILABLE_MODELS[0].id);

  // Parse progress to number if possible (format is typically "Loading... 50%")
  // Actually WebLLM text is complex. We'll just show the text.
  // But shadcn Progress needs a number. We'll create a fake one or just use text.
  // Let's rely on the text display.
  
  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <div className="flex gap-2">
        <Select 
            value={selectedId} 
            onValueChange={setSelectedId} 
            disabled={isLoading}
        >
          <SelectTrigger className="w-full bg-black/50 border-primary/50 text-white font-medium focus:ring-primary">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="bg-card border-primary text-white font-medium">
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem 
                key={model.id} 
                value={model.id}
                className="focus:bg-primary/20 focus:text-white font-medium"
              >
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
            onClick={() => onLoadModel(selectedId)}
            disabled={isLoading || currentModel === selectedId}
            className={cn(
                "min-w-[100px]",
                currentModel === selectedId 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
        >
            {isLoading && selectedId === currentModel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentModel === selectedId ? (
                <>
                    <Check className="h-4 w-4 mr-2" />
                    Active
                </>
            ) : (
                <>
                    <Download className="h-4 w-4 mr-2" />
                    Load
                </>
            )}
        </Button>
      </div>
      
      {isLoading && (
        <div className="text-xs text-primary/80 animate-pulse truncate">
            {progress}
        </div>
      )}
    </div>
  );
}
