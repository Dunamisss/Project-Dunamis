import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { IMAGE_LIBRARY } from "@/data/imageLibrary";
import { PROMPT_LIBRARY } from "@/data/promptLibrary";
import { useChat } from "@/contexts/ChatContext";

const reverseEngineerPrompt = PROMPT_LIBRARY.find((prompt) => prompt.id === "reverse-engineer-image");

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
      return;
    }
    document.title = `${image.title} — DUNAMIS`;
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

  const handleShare = async () => {
    const url = window.location.href;
    await handleCopy(url);
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
          {copyFeedback && <div className="text-[11px] text-yellow-200/80">{copyFeedback}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => handleCopy(image.full)}>
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
              onClick={handleShare}
            >
              Share
            </Button>
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={handleReverseEngineer}
              disabled={!reverseEngineerPrompt}
            >
              Reverse-Engineer Prompt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
