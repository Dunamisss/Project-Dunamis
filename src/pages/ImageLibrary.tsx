import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShareMenu from "@/components/ShareMenu";
import { IMAGE_LIBRARY } from "@/data/imageLibrary";
import { PROMPT_LIBRARY } from "@/data/promptLibrary";
import { useChat } from "@/contexts/ChatContext";

const reverseEngineerPrompt = PROMPT_LIBRARY.find((prompt) => prompt.id === "reverse-engineer-image");
const PAGE_SIZE = 24;

export default function ImageLibrary() {
  const [, setLocation] = useLocation();
  const { loadPrompt } = useChat();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [autoLoad, setAutoLoad] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    IMAGE_LIBRARY.forEach((image) => image.tags.forEach((tag) => tagSet.add(tag)));
    return ["All", ...Array.from(tagSet).sort()];
  }, []);

  const filteredImages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IMAGE_LIBRARY;
    return IMAGE_LIBRARY.filter((image) => {
      const haystack = [
        image.title,
        image.description,
        image.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const filteredByTag = useMemo(() => {
    if (tagFilter === "All") return filteredImages;
    return filteredImages.filter((image) => image.tags.includes(tagFilter));
  }, [filteredImages, tagFilter]);

  const visibleImages = useMemo(() => filteredByTag.slice(0, visibleCount), [filteredByTag, visibleCount]);

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopy = async (text: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback("Copied to clipboard.");
    } catch {
      showCopyFeedback("Copy failed. Please select and copy manually.");
    }
  };

  const handleReverseEngineer = () => {
    if (!reverseEngineerPrompt) return;
    loadPrompt(reverseEngineerPrompt.content);
    showCopyFeedback("Reverse-engineer prompt loaded. Upload an image in the optimizer.");
    setLocation("/");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imageId = params.get("image");
    if (!imageId) return;
    setHighlightId(imageId);
    const target = document.getElementById(`image-${imageId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredByTag.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [autoLoad, filteredByTag.length]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Image Library</h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Original visual creations. Click an image for full size or reverse-engineer a prompt.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Optimizer
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-4 md:p-6 shadow-lg space-y-4">
          <div className="rounded-md border border-yellow-500/20 bg-black/50 p-4 text-sm text-gray-300">
            <p className="font-semibold text-yellow-200">How to recreate a prompt</p>
            <p className="mt-2 text-xs text-gray-300">
              We don’t generate images here. Use <strong>Reverse-Engineer Prompt</strong> to load the prompt,
              then upload your image in the optimizer to get a detailed prompt. Paste that prompt into your
              image model of choice to recreate or remix the artwork.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-3">
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search images or tags..."
              className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
            />
            <Select
              value={tagFilter}
              onValueChange={(value) => {
                setTagFilter(value);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <SelectTrigger className="border-yellow-500/40 bg-black/30 text-yellow-200">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={handleReverseEngineer}
              disabled={!reverseEngineerPrompt}
            >
              Reverse-Engineer Prompt
            </Button>
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={() => setAutoLoad((prev) => !prev)}
            >
              Auto-load: {autoLoad ? "On" : "Off"}
            </Button>
          </div>
          {copyFeedback && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-yellow-500/40 bg-black/90 px-4 py-2 text-[12px] text-yellow-200 shadow-lg">
              {copyFeedback}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleImages.map((image) => (
            <div
              key={image.id}
              id={`image-${image.id}`}
              className={[
                "rounded-lg border border-yellow-500/20 bg-black/60 p-4 shadow-lg space-y-4 transition",
                highlightId === image.id ? "ring-2 ring-yellow-400/80" : ""
              ].join(" ")}
            >
              <a href={image.full} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={image.thumb}
                  alt={image.title}
                  loading="lazy"
                  className="h-56 w-full object-cover rounded-md border border-yellow-500/20"
                />
              </a>
              <div className="space-y-2">
                <Link href={`/image/${image.id}`}>
                  <h2 className="text-lg font-semibold text-yellow-100 hover:text-yellow-200 transition">
                    {image.title}
                  </h2>
                </Link>
                <p className="text-sm text-gray-300">{image.description}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                  {image.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={() => handleCopy(image.full)}
                >
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => window.open(image.full, "_blank", "noopener,noreferrer")}
                >
                  View Full
                </Button>
                <ShareMenu
                  title={image.title}
                  url={`${window.location.origin}/image/${image.id}`}
                  onCopy={showCopyFeedback}
                />
              </div>
            </div>
          ))}
        </div>

        {filteredByTag.length === 0 && (
          <div className="text-sm text-gray-400">No images matched your search.</div>
        )}
        {filteredByTag.length > visibleCount && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Load more
            </Button>
          </div>
        )}
        <div ref={loadMoreRef} />
      </div>
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full border border-yellow-500/40 bg-black/90 text-yellow-200 shadow-lg hover:bg-yellow-500/10"
          aria-label="Back to top"
        >
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgba(234,179,8,0.2)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgba(234,179,8,0.9)"
              strokeWidth="2"
              strokeDasharray={`${Math.round(scrollProgress * 100)} 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">↑</span>
        </button>
      )}
    </div>
  );
}
