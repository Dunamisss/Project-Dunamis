import { useEffect, useRef, useState } from "react";
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

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function AuthModal({ trigger }: { trigger?: React.ReactNode }) {
  const { login, resetPassword, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [humanA, setHumanA] = useState(() => Math.floor(Math.random() * 8) + 2);
  const [humanB, setHumanB] = useState(() => Math.floor(Math.random() * 8) + 2);
  const [humanAnswer, setHumanAnswer] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = (((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || "") as string).trim();
  const apiBase = (((import.meta as any).env?.VITE_API_BASE || "") as string).trim().replace(/\/+$/, "");
  const turnstileVerifyUrl = apiBase ? `${apiBase}/api/turnstile-verify` : "/api/turnstile-verify";
  const emailCheckUrl = apiBase ? `${apiBase}/api/email-check` : "/api/email-check";

  useEffect(() => {
    if (!open || !turnstileSiteKey) return;
    let cancelled = false;

    const loadScript = async () => {
      if (window.turnstile) return;
      const existing = document.querySelector('script[data-turnstile-script="1"]') as HTMLScriptElement | null;
      if (existing) {
        await new Promise<void>((resolve) => {
          if ((window as any).turnstile) resolve();
          existing.addEventListener("load", () => resolve(), { once: true });
        });
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.setAttribute("data-turnstile-script", "1");
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Turnstile script."));
        document.head.appendChild(script);
      });
    };

    const initWidget = async () => {
      try {
        await loadScript();
        if (cancelled || !window.turnstile || !turnstileContainerRef.current) return;

        if (turnstileWidgetIdRef.current) {
          window.turnstile.remove(turnstileWidgetIdRef.current);
          turnstileWidgetIdRef.current = null;
        }

        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token: string) => {
            setTurnstileToken(token);
            setAuthError(null);
          },
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
        turnstileWidgetIdRef.current = widgetId;
        setTurnstileReady(true);
      } catch {
        setTurnstileReady(false);
        setAuthError("Captcha failed to load. Refresh and try again.");
      }
    };

    initWidget();
    return () => {
      cancelled = true;
    };
  }, [open, turnstileSiteKey]);

  const refreshHumanCheck = () => {
    setHumanA(Math.floor(Math.random() * 8) + 2);
    setHumanB(Math.floor(Math.random() * 8) + 2);
    setHumanAnswer("");
  };

  const verifyHumanCheck = () => {
    const expected = humanA + humanB;
    const actual = Number.parseInt(humanAnswer.trim(), 10);
    if (Number.isNaN(actual) || actual !== expected) {
      setAuthError("Human check failed. Please solve the math question.");
      refreshHumanCheck();
      return false;
    }
    return true;
  };

  const verifyTurnstile = async () => {
    if (!turnstileSiteKey) return true;
    if (!turnstileToken) {
      setAuthError("Please complete the captcha first.");
      return false;
    }

    try {
      const response = await fetch(turnstileVerifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        setAuthError("Captcha verification failed. Please try again.");
        if (window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
        setTurnstileToken("");
        return false;
      }
      return true;
    } catch {
      setAuthError("Captcha verification failed. Please try again.");
      return false;
    }
  };

  const verifyEmailAllowed = async (value: string) => {
    try {
      const response = await fetch(emailCheckUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.valid !== true) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Email not allowed. Please use a non-temporary email."
        );
      }
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Email check failed.");
      return false;
    }
  };

  const handleLogin = async (provider: "google" | "github" | "email") => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    setNotice(null);
    try {
      const captchaOk = await verifyTurnstile();
      if (!captchaOk) {
        return;
      }
      if (provider === "email") {
        if (!email.trim()) {
          throw new Error("Email is required.");
        }
        if (!password || password.length < 6) {
          throw new Error("Password is required (minimum 6 characters).");
        }
        if (!verifyHumanCheck()) {
          return;
        }
      }
      await login(provider, email.trim(), password);
      setOpen(false);
    } catch (error: any) {
      const code = typeof error?.code === "string" ? error.code : "";
      if (
        code === "auth/cancelled-popup-request" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/popup-blocked"
      ) {
        // Silent: user cancelled/blocked popup or double-clicked sign-in.
      } else {
        const message =
          typeof error?.message === "string"
            ? error.message
            : "Sign in failed. Please try again.";
        setAuthError(message);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignup = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    setNotice(null);
    try {
      const captchaOk = await verifyTurnstile();
      if (!captchaOk) {
        return;
      }
      if (!email.trim()) {
        throw new Error("Email is required.");
      }
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      const emailAllowed = await verifyEmailAllowed(email.trim());
      if (!emailAllowed) {
        return;
      }
      if (!verifyHumanCheck()) {
        return;
      }
      await login("signup", email.trim(), password);
      setOpen(false);
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Sign up failed. Please try again.";
      setAuthError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setAuthError("Enter your email to reset your password.");
      return;
    }
    setIsAuthenticating(true);
    setAuthError(null);
    setNotice(null);
    try {
      const captchaOk = await verifyTurnstile();
      if (!captchaOk) {
        setIsAuthenticating(false);
        return;
      }
      if (!verifyHumanCheck()) {
        setIsAuthenticating(false);
        return;
      }
      await resetPassword(email.trim());
      setNotice("Password reset email sent.");
    } catch {
      setAuthError("Could not send reset email. Try again.");
    } finally {
      setIsAuthenticating(false);
    }
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
          {turnstileSiteKey && (
            <div className="rounded-md border border-white/10 bg-black/20 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Security check required for all sign-in methods.
              </p>
              <div ref={turnstileContainerRef} />
              {!turnstileReady && (
                <p className="text-[11px] text-muted-foreground">Loading captcha...</p>
              )}
            </div>
          )}
          <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => handleLogin("google")} disabled={isLoading || isAuthenticating}>
            {isLoading || isAuthenticating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => handleLogin("github")} disabled={isLoading || isAuthenticating}>
            {isLoading || isAuthenticating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
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
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              className="bg-black/20 border-white/10"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-black/20 border-white/10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="human-check">Human Check: {humanA} + {humanB} = ?</Label>
            <Input
              id="human-check"
              type="text"
              inputMode="numeric"
              placeholder="Enter answer"
              className="bg-black/20 border-white/10"
              value={humanAnswer}
              onChange={(event) => setHumanAnswer(event.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            This helps block basic bots from abusing email sign-in.
          </p>
          <Button onClick={() => handleLogin("email")} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || isAuthenticating}>
            {(isLoading || isAuthenticating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In with Email
          </Button>
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 hover:text-white"
            onClick={handleSignup}
            disabled={isLoading || isAuthenticating}
          >
            Create Account
          </Button>
          <Button
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-white"
            onClick={handleReset}
            disabled={isLoading || isAuthenticating}
          >
            Forgot password?
          </Button>
          {authError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {authError}
            </div>
          )}
          {notice && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
              {notice}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
