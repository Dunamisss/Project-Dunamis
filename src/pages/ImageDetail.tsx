import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { IMAGE_LIBRARY } from "@/data/imageLibrary";
import { PROMPT_LIBRARY } from "@/data/promptLibrary";
import { useChat } from "@/contexts/ChatContext";
import ShareMenu from "@/components/ShareMenu";

const reverseEngineerPrompt = PROMPT_LIBRARY.find((prompt) => prompt.id === "reverse-engineer-simple");

const DEFAULT_META = {
  title: "DUNAMIS — Precision Prompt Engineering",
  description: "Build, score, and refine prompts with a production-grade optimizer and auditor built for creators who ship.",
  image: "https://dunamiss.xyz/dunamis-hero.webp",
  url: "https://dunamiss.xyz/",
};

const setMeta = (name: string, content: string) => {
  const selector = name.startsWith("og:") ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let tag = document.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    if (name.startsWith("og:")) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

export default function ImageDetail({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { loadPrompt } = useChat();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const imageId = params?.id;

  const image = useMemo(
    () => IMAGE_LIBRARY.find((item) => item.id === imageId),
    [imageId]
  );

  useEffect(() => {
    if (!image) {
      document.title = "Image Not Found — DUNAMIS";
      setMeta("og:title", "Image Not Found — DUNAMIS");
      setMeta("og:description", DEFAULT_META.description);
      setMeta("og:image", DEFAULT_META.image);
      setMeta("og:url", window.location.href);
      setMeta("twitter:title", "Image Not Found — DUNAMIS");
      setMeta("twitter:description", DEFAULT_META.description);
      setMeta("twitter:image", DEFAULT_META.image);
      return;
    }
    document.title = `${image.title} — DUNAMIS`;
    const description = image.description || DEFAULT_META.description;
    const url = window.location.href;
    const imageUrl = `${window.location.origin}${image.full}`;
    setMeta("og:title", `${image.title} — DUNAMIS`);
    setMeta("og:description", description);
    setMeta("og:image", imageUrl);
    setMeta("og:url", url);
    setMeta("twitter:title", `${image.title} — DUNAMIS`);
    setMeta("twitter:description", description);
    setMeta("twitter:image", imageUrl);
  }, [image]);

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
    showCopyFeedback("Reverse-engineer prompt loaded. Upload the image in the optimizer.");
    setLocation("/");
  };

  if (!image) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-16 max-w-4xl mx-auto space-y-6 text-center">
          <h1 className="text-3xl font-semibold text-yellow-200">Image not found</h1>
          <p className="text-sm text-gray-300">That image doesn’t exist or was removed.</p>
          <Link href="/images">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Image Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">{image.title}</h1>
            <p className="text-sm text-gray-300 max-w-2xl">{image.description}</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
              {image.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/images">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Gallery
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-5 shadow-lg space-y-4">
          <a href={image.full} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={image.full}
              alt={image.title}
              className="w-full max-h-[720px] object-contain rounded-md border border-yellow-500/20 bg-black/60"
            />
          </a>
          {copyFeedback && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-yellow-500/40 bg-black/90 px-4 py-2 text-[12px] text-yellow-200 shadow-lg">
              {copyFeedback}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-yellow-400 text-black hover:bg-yellow-300"
              onClick={handleReverseEngineer}
              disabled={!reverseEngineerPrompt}
            >
              Try Me
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
      </div>
    </div>
  );
}
