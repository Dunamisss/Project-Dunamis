import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ColoringComingSoon() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),rgba(0,0,0,0.95)_45%,rgba(0,0,0,1)_80%)]" />
      <div className="relative z-10 px-4 py-12 max-w-4xl mx-auto">
        <div className="rounded-xl border border-yellow-500/30 bg-black/65 p-6 md:p-8 shadow-lg space-y-5">
          <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Update</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Coloring Studio: Coming Soon</h1>
          <p className="text-sm text-gray-300">
            We paused this section for a full rebuild. The next version will ask simple user questions and generate
            proper printable coloring pages with download and print flow.
          </p>
          <div className="rounded-lg border border-yellow-500/20 bg-black/35 p-4 space-y-1">
            <p className="text-sm text-gray-300">What’s next:</p>
            <p className="text-sm text-gray-300">1. Prompted coloring page generation</p>
            <p className="text-sm text-gray-300">2. Cleaner kid-friendly outlines (teddy, bunny, and more)</p>
            <p className="text-sm text-gray-300">3. Direct download and print links</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300">Back to Homepage</Button>
            </Link>
            <Link href="/starter-packs">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                View Starter Packs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
