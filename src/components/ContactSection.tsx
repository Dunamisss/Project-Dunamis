import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Heart } from "lucide-react";
import { toast } from "sonner";

export default function ContactSection() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent", {
      description: "We'll get back to you shortly."
    });
    // Reset form logic would go here
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
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                  <Heart className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Support Us</p>
                  <p className="text-sm text-muted-foreground">If you enjoy using these prompts, consider a small donation on Ko-fi to help us continue creating amazing prompts!</p>
                  <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="mt-2 border-pink-500/50 hover:bg-pink-500/10 text-pink-500">
                      Support on Ko-fi
                    </Button>
                  </a>
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
                <div className="space-y-2">
                  <Input placeholder="Your Name" className="bg-black/20 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Input type="email" placeholder="Email Address" className="bg-black/20 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Textarea placeholder="How can we help?" className="bg-black/20 border-white/10 min-h-[120px]" required />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="mr-2 h-4 w-4" /> Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
