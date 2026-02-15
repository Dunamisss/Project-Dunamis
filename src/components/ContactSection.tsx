import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Heart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim().replace(/\/+$/, "");
    const url = apiBase ? `${apiBase}/api/contact` : "/api/contact";

    setIsSending(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, company }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not send your message.");
      }

      toast.success("Message sent", {
        description: "We'll get back to you shortly.",
      });
      setName("");
      setEmail("");
      setMessage("");
      setCompany("");
    } catch (error) {
      toast.error("Send failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="py-24 bg-card/30 border-t border-white/5">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="font-display text-4xl text-primary mb-6">Get in Touch</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Have questions about our enterprise plans, custom prompt engineering, or platform access? We're here to help.
            </p>
            
            <div className="space-y-6">
              <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                  <Heart className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Support Us</p>
                  <p className="text-sm text-muted-foreground">If you enjoy using these prompts, consider a small donation on Ko-fi to help us continue creating amazing prompts!</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tip supporters can be upgraded to unlimited uses — just donate and we’ll unlock your account.
                  </p>
                  <a href="https://ko-fi.com/dunamis_site" target="_blank" rel="noopener noreferrer">
                    <Button
                      className="mt-3 bg-pink-500 text-white hover:bg-pink-400 shadow-lg shadow-pink-500/30"
                    >
                      Support on Ko-fi
                    </Button>
                  </a>
                </div>
                </div>
              </div>
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Quick Access</p>
                    <p className="text-sm text-muted-foreground">Scan to open Dunamis on your phone.</p>
                  </div>
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://dunamiss.xyz/"
                    alt="QR code to open dunamiss.xyz"
                    className="h-20 w-20 rounded-md border border-yellow-500/40 bg-black/60"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-background/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
              <CardDescription>We typically respond within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="hidden">
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company"
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Your Name"
                    className="bg-black/20 border-white/10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email Address"
                    className="bg-black/20 border-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="How can we help?"
                    className="bg-black/20 border-white/10 min-h-[120px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={10}
                    maxLength={4000}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSending}
                >
                  <Send className="mr-2 h-4 w-4" /> {isSending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
