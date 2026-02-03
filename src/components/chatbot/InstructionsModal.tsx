import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/models";

export function InstructionsModal() {
  return (
    <Dialog onOpenChange={(open) => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 hover:bg-primary/10">
          <Info className="h-5 w-5" />
          <span className="sr-only">Model Information</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-card border-primary text-foreground flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl text-primary font-display">Model Guide</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Compare the available free AI models to choose the best one for your needs.
            All models run entirely in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 hover:bg-transparent">
                <TableHead className="text-primary">Model Name</TableHead>
                <TableHead className="text-primary">Best For</TableHead>
                <TableHead className="text-primary">Resource Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AVAILABLE_MODELS.map((model) => (
                <TableRow key={model.id} className="border-primary/10 hover:bg-primary/5">
                  <TableCell className="font-medium text-foreground">
                    {model.name}
                    <div className="text-xs text-muted-foreground mt-1">{model.description}</div>
                  </TableCell>
                  <TableCell className="text-foreground/90">{model.strengths}</TableCell>
                  <TableCell className="text-foreground/90">{model.vram}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

