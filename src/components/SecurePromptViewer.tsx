import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { checkPromptAccess, claimTrialPrompt, logAudit } from "@/lib/firestore-access";
import type { Prompt, PromptAccessType } from "@/types";

interface SecurePromptViewerProps {
  prompt: Prompt;
  onRequestPremium?: () => void;
}

export default function SecurePromptViewer({
  prompt,
  onRequestPremium,
}: SecurePromptViewerProps) {
  const { user, userProfile, isBanned, accessTier } = useAuth();
  const [access, setAccess] = useState<PromptAccessType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimingTrial, setClaimingTrial] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsLoading(false);
        setAccess(null);
        return;
      }

      setIsLoading(true);
      try {
        // Public prompts accessible to all
        if (prompt.accessLevel === "public") {
          setAccess("free");
          setIsLoading(false);
          return;
        }

        // Check database for access
        const userAccess = await checkPromptAccess(user.uid, prompt.id);
        setAccess(userAccess);
      } catch (error) {
        console.error("Error checking prompt access:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user, prompt.id, prompt.accessLevel]);

  const handleClaimTrial = async () => {
    if (!user) return;

    setClaimingTrial(true);
    try {
      const success = await claimTrialPrompt(user.uid);
      if (success) {
        setAccess("trial");
        await logAudit(user.uid, "prompt_access_granted", prompt.id, "Trial prompt claimed");
      }
    } catch (error) {
      console.error("Error claiming trial:", error);
    } finally {
      setClaimingTrial(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardContent className="pt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  // User is banned
  if (isBanned) {
    return (
      <Card className="bg-black/40 border-destructive/30">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your account has been suspended. {userProfile?.banReason && `Reason: ${userProfile.banReason}`}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Sign In to View Prompt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You must sign in to view this prompt's content.
          </p>
          <p className="text-xs text-muted-foreground">
            When you sign in, you'll get a free trial prompt to test.
          </p>
        </CardContent>
      </Card>
    );
  }

  // User has access
  const hasAccess = access !== null;

  return (
    <Card className="bg-black/40 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {prompt.title}
          {prompt.accessLevel === "premium" && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              Premium
            </span>
          )}
          {access === "trial" && (
            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
              Trial
            </span>
          )}
        </CardTitle>
        <CardDescription>{prompt.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasAccess ? (
          // NO ACCESS STATES
          <>
            {prompt.accessLevel === "public" ? (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertDescription>This is a free public prompt.</AlertDescription>
              </Alert>
            ) : prompt.accessLevel === "member" ? (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertDescription>Sign in to unlock this prompt.</AlertDescription>
              </Alert>
            ) : (
              // PREMIUM OR CUSTOM - offer trial
              <>
                {!userProfile?.trialPromptUsed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <Alert className="bg-primary/5 border-primary/20">
                      <AlertDescription>
                        This is a premium prompt. Get a free trial!
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleClaimTrial}
                      disabled={claimingTrial}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {claimingTrial ? "Claiming..." : "Claim Your Free Trial Prompt"}
                    </Button>
                  </motion.div>
                ) : (
                  <Alert className="bg-yellow-500/5 border-yellow-500/20">
                    <AlertDescription>
                      You've used your free trial. Upgrade to premium for full access to all prompts.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={onRequestPremium}
                  variant="outline"
                  className="w-full border-white/10 hover:border-primary/30"
                >
                  Upgrade to Premium
                </Button>
              </>
            )}
          </>
        ) : (
          // HAS ACCESS - SHOW CONTENT
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Preview or Content */}
              <div
                className={`relative p-4 rounded-lg bg-black/60 border border-white/5 overflow-hidden transition-all ${
                  !showContent && access !== "free"
                    ? "blur-sm select-none"
                    : ""
                }`}
              >
                <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {showContent || access === "free"
                    ? prompt.content
                    : prompt.previewContent || prompt.content.slice(0, 200) + "..."}
                </div>

                {/* Trial Blur Overlay */}
                {access === "trial" && !showContent && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="text-xs text-primary font-medium">Trial - Click to View</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle for Trial */}
              {access === "trial" && (
                <Button
                  onClick={() => setShowContent(!showContent)}
                  variant="outline"
                  className="w-full border-white/10 hover:border-primary/30"
                >
                  {showContent ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" /> Hide Content
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" /> Show Trial Content
                    </>
                  )}
                </Button>
              )}

              {/* Copy Button */}
              <Button
                onClick={handleCopyPrompt}
                variant="outline"
                className="w-full border-white/10 hover:border-primary/30"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy Prompt
                  </>
                )}
              </Button>

              {/* Trial Info */}
              {access === "trial" && (
                <Alert className="bg-yellow-500/5 border-yellow-500/20">
                  <AlertDescription className="text-xs">
                    This is your free trial prompt. The content is hidden until you click "Show Trial Content". This trial cannot be shared or exported.
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
