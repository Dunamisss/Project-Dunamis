import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

  const handleShare = async (id: string) => {
    const url = `${window.location.origin}/images?image=${encodeURIComponent(id)}`;
    await handleCopy(url);
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
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
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
          </div>
          {copyFeedback && <div className="text-[11px] text-yellow-200/80">{copyFeedback}</div>}
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
                <h2 className="text-lg font-semibold text-yellow-100">{image.title}</h2>
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
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => handleShare(image.id)}
                >
                  Share
                </Button>
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
      </div>
    </div>
  );
}
