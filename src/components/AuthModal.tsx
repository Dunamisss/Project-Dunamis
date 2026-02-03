import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { Github, Mail, Loader2 } from "lucide-react";

// Mock Google Icon
const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" className="h-4 w-4 mr-2" fill="currentColor">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
);

export function AuthModal({ trigger }: { trigger?: React.ReactNode }) {
  const { login, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogin = (provider: "google" | "github" | "email") => {
    login(provider);
    setTimeout(() => setOpen(false), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="ghost">Sign In</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-card border-white/10">
        <DialogHeader className="text-center">
          <DialogTitle className="font-display text-2xl text-primary">Join Dunamis</DialogTitle>
          <DialogDescription>
            Sign in to submit prompts, track your stats, and join the elite.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => handleLogin("google")} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => handleLogin("github")} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
            Continue with GitHub
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" className="bg-black/20 border-white/10" />
          </div>
          <Button onClick={() => handleLogin("email")} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In with Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
