import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createCustomPromptRequest } from "@/lib/firestore-access";

const DONATION_TIERS = [
  { amount: 25, label: "Starter", description: "Simple prompt (1-50 words)" },
  { amount: 50, label: "Professional", description: "Advanced prompt (50-200 words)" },
  { amount: 75, label: "Enterprise", description: "Complex system prompt (200+ words)" },
];

export default function CustomPromptRequest() {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<number>(50);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be signed in to request a custom prompt");
      return;
    }

    if (!description.trim()) {
      toast.error("Please describe what you need");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestId = await createCustomPromptRequest(
        user.uid,
        user.email || "",
        description,
        selectedTier
      );

      toast.success("Custom prompt request submitted!", {
        description: `You'll receive an email at ${user.email} once it's ready. Request ID: ${requestId.slice(0, 8)}...`,
      });

      setDescription("");
      setSelectedTier(50);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-24 px-6 md:px-12 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Custom Tailored Prompts
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Need something unique? We'll create a custom prompt specifically designed for your use case. Simply describe what you need and make a donation.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <Card className="bg-black/40 border-white/10 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Request Your Custom Prompt
              </CardTitle>
              <CardDescription>
                Choose your desired complexity level and describe your requirements.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Donation Tiers */}
                <div>
                  <Label className="text-sm uppercase tracking-wide text-muted-foreground mb-3 block">
                    Select Your Tier
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {DONATION_TIERS.map((tier) => (
                      <motion.button
                        key={tier.amount}
                        type="button"
                        onClick={() => setSelectedTier(tier.amount)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedTier === tier.amount
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-black/60 hover:border-primary/50"
                        }`}
                      >
                        <div className="font-bold text-primary">£{tier.amount}</div>
                        <div className="font-medium text-foreground">{tier.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {tier.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm uppercase tracking-wide">
                    Describe Your Needs
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Example: Create a prompt that helps me write engaging LinkedIn posts for a SaaS company. The prompt should include tone guidelines, structure tips, and hashtag suggestions..."
                    className="mt-2 min-h-32 bg-black/60 border-white/10 text-foreground"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Be as detailed as possible. The more specific you are, the better the prompt.
                  </p>
                </div>

                {/* Info Alert */}
                <Alert className="bg-primary/5 border-primary/20">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    You'll receive your custom prompt via email within 24-48 hours. It's yours to keep forever!
                  </AlertDescription>
                </Alert>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !user}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Custom Prompt Request
                    </>
                  )}
                </Button>

                {!user && (
                  <Alert className="bg-yellow-500/5 border-yellow-500/20">
                    <AlertDescription>
                      Sign in with Google or GitHub to submit a custom prompt request.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
