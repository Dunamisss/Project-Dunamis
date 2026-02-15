import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/contexts/ChatContext";

type PromptPreset = {
  id: string;
  label: string;
  ageGroup: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  prompt: string;
};

type SvgTemplate = {
  id: string;
  name: string;
  path: string;
  level: "Easy" | "Medium" | "Advanced";
};

const SVG_TEMPLATES: SvgTemplate[] = [
  { id: "teddy", name: "Teddy Bear", path: "/coloring-studio/teddy.svg", level: "Easy" },
  { id: "bunny", name: "Bunny", path: "/coloring-studio/bunny.svg", level: "Easy" },
  { id: "panda", name: "Panda Character", path: "/coloring-studio/panda.svg", level: "Medium" },
  { id: "unicorn", name: "Unicorn", path: "/coloring-studio/unicorn.svg", level: "Medium" },
  { id: "dinosaur", name: "Dinosaur", path: "/coloring-studio/dinosaur.svg", level: "Medium" },
  { id: "cat", name: "Cat", path: "/coloring-studio/cat.svg", level: "Medium" },
  { id: "bulldog", name: "Bulldog", path: "/coloring-studio/bulldog.svg", level: "Advanced" },
  { id: "robot", name: "Robot Mascot", path: "/coloring-studio/robot.svg", level: "Advanced" },
];

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "kids-kawaii",
    label: "Kids: Kawaii Toy",
    ageGroup: "Young Kids",
    difficulty: "Easy",
    prompt:
      "Kawaii plushie [SUBJECT], very thick black outlines, wide open white spaces, simple shapes, no shading, no textures, high contrast, white background --no grey, shadows",
  },
  {
    id: "kids-boombox",
    label: "Kids: Boombox Jungle",
    ageGroup: "Young Kids",
    difficulty: "Easy",
    prompt:
      "Kawaii plushie lion with a sunflower mane, very thick black outlines, wide open white spaces, simple shapes, no shading, no textures, high contrast, white background --no grey, shadows",
  },
  {
    id: "older-vinyl",
    label: "Older Kids: Vinyl Hero",
    ageGroup: "Older Kids",
    difficulty: "Medium",
    prompt:
      "Stylized vinyl toy [SUBJECT], bold outlines, street art aesthetic, clean vector lines, minimal hatching, high energy, white background --no gradients, realistic fur",
  },
  {
    id: "older-street",
    label: "Older Kids: Street Character",
    ageGroup: "Older Kids",
    difficulty: "Medium",
    prompt:
      "Stylized vinyl toy of a bulldog wearing a hoodie and a gold chain, bold outlines, street art aesthetic, clean vector lines, minimal hatching, high energy, white background --no gradients, realistic fur",
  },
  {
    id: "adult-crochet",
    label: "Adults: Crochet Plush",
    ageGroup: "Adults",
    difficulty: "Advanced",
    prompt:
      "Intricate [SUBJECT] Zentangle art, highly detailed patterns, thin and thick line variation, ornate paisley and geometric fills, professional ink drawing style, white background --no shading, no colors",
  },
  {
    id: "adult-reggae",
    label: "Adults: Reggae Luxe Lion",
    ageGroup: "Adults",
    difficulty: "Advanced",
    prompt:
      "Intricate Sea Turtle Zentangle art, highly detailed patterns, thin and thick line variation, ornate paisley and geometric fills, professional ink drawing style, white background --no shading, no colors",
  },
];

const DIFFICULTY_ORDER: Record<PromptPreset["difficulty"], number> = {
  Easy: 1,
  Medium: 2,
  Advanced: 3,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function badgeClass(level: PromptPreset["difficulty"]): string {
  if (level === "Easy") return "border-emerald-400/40 text-emerald-200 bg-emerald-500/10";
  if (level === "Medium") return "border-yellow-400/40 text-yellow-200 bg-yellow-500/10";
  return "border-orange-400/40 text-orange-200 bg-orange-500/10";
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function applyBlur(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const norm = 16;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        const sy = clamp(y + ky, 0, height - 1);
        for (let kx = -1; kx <= 1; kx += 1) {
          const sx = clamp(x + kx, 0, width - 1);
          acc += gray[sy * width + sx] * kernel[k];
          k += 1;
        }
      }
      out[y * width + x] = acc / norm;
    }
  }

  return out;
}

function sobelMagnitude(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);
  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let gx = 0;
      let gy = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        const sy = clamp(y + ky, 0, height - 1);
        for (let kx = -1; kx <= 1; kx += 1) {
          const sx = clamp(x + kx, 0, width - 1);
          const val = gray[sy * width + sx];
          gx += val * gxKernel[k];
          gy += val * gyKernel[k];
          k += 1;
        }
      }
      out[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return out;
}

function thickenLines(binary: Uint8ClampedArray, width: number, height: number, passes: number): Uint8ClampedArray {
  let current = binary;
  for (let pass = 0; pass < passes; pass += 1) {
    const out = new Uint8ClampedArray(current.length);
    out.fill(255);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let hasBlackNeighbor = false;
        for (let ky = -1; ky <= 1 && !hasBlackNeighbor; ky += 1) {
          const sy = clamp(y + ky, 0, height - 1);
          for (let kx = -1; kx <= 1; kx += 1) {
            const sx = clamp(x + kx, 0, width - 1);
            if (current[sy * width + sx] === 0) {
              hasBlackNeighbor = true;
              break;
            }
          }
        }

        out[y * width + x] = hasBlackNeighbor ? 0 : 255;
      }
    }

    current = out;
  }

  return current;
}

async function convertToLineArt(file: File, threshold: number, thickness: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1600;
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const srcCanvas = createCanvas(width, height);
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) {
    throw new Error("Canvas is unavailable in this browser.");
  }

  srcCtx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const source = srcCtx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);

  for (let i = 0; i < gray.length; i += 1) {
    const offset = i * 4;
    const r = source.data[offset];
    const g = source.data[offset + 1];
    const b = source.data[offset + 2];
    gray[i] = r * 0.299 + g * 0.587 + b * 0.114;
  }

  const blurred = applyBlur(gray, width, height);
  const edges = sobelMagnitude(blurred, width, height);

  let maxMag = 0;
  for (let i = 0; i < edges.length; i += 1) {
    if (edges[i] > maxMag) maxMag = edges[i];
  }

  const normalizedThreshold = (threshold / 255) * (maxMag || 1);
  const binary = new Uint8ClampedArray(width * height);
  for (let i = 0; i < edges.length; i += 1) {
    binary[i] = edges[i] >= normalizedThreshold ? 0 : 255;
  }

  const thickened = thickenLines(binary, width, height, Math.max(0, thickness - 1));

  const outCanvas = createCanvas(width, height);
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) {
    throw new Error("Output canvas failed to initialize.");
  }

  const outImage = outCtx.createImageData(width, height);
  for (let i = 0; i < thickened.length; i += 1) {
    const offset = i * 4;
    const v = thickened[i];
    outImage.data[offset] = v;
    outImage.data[offset + 1] = v;
    outImage.data[offset + 2] = v;
    outImage.data[offset + 3] = 255;
  }

  outCtx.putImageData(outImage, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Image export failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export default function ColoringPageMachine() {
  const { loadPrompt } = useChat();
  const [, setLocation] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [lineArtPreview, setLineArtPreview] = useState<string | null>(null);
  const [lineArtBlob, setLineArtBlob] = useState<Blob | null>(null);
  const [threshold, setThreshold] = useState(110);
  const [thickness, setThickness] = useState(2);
  const [isWorking, setIsWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(SVG_TEMPLATES[0].id);
  const [brushColor, setBrushColor] = useState("#f59e0b");
  const [brushSize, setBrushSize] = useState(16);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outlineImageRef = useRef<HTMLImageElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const selectedTemplate = useMemo(
    () => SVG_TEMPLATES.find((item) => item.id === selectedTemplateId) || SVG_TEMPLATES[0],
    [selectedTemplateId],
  );

  useEffect(() => {
    return () => {
      if (sourcePreview) URL.revokeObjectURL(sourcePreview);
      if (lineArtPreview) URL.revokeObjectURL(lineArtPreview);
    };
  }, [sourcePreview, lineArtPreview]);

  const chosenPresetLabel = useMemo(() => {
    return `${PROMPT_PRESETS.length} starter prompts ready`;
  }, []);

  const sortedPresets = useMemo(() => {
    return [...PROMPT_PRESETS].sort((a, b) => {
      const byDifficulty = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
      if (byDifficulty !== 0) return byDifficulty;
      return a.label.localeCompare(b.label);
    });
  }, []);

  useEffect(() => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [selectedTemplateId]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    lastPointRef.current = point;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = brushColor;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    event.preventDefault();
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = brushColor;
    const last = lastPointRef.current || point;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = paintCanvasRef.current;
    if (canvas) {
      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // ignore capture release errors
      }
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const onSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    if (!next) return;

    if (!next.type.startsWith("image/")) {
      setFeedback("Please upload a JPG/PNG/WebP image.");
      return;
    }

    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (lineArtPreview) {
      URL.revokeObjectURL(lineArtPreview);
      setLineArtPreview(null);
    }

    const preview = URL.createObjectURL(next);
    setFile(next);
    setSourcePreview(preview);
    setLineArtBlob(null);
    setFeedback(`Loaded ${next.name}`);
  };

  const onConvert = async () => {
    if (!file || isWorking) {
      if (!file) setFeedback("Upload a photo first.");
      return;
    }

    setIsWorking(true);
    setFeedback("Converting photo to line art...");

    try {
      const blob = await convertToLineArt(file, threshold, thickness);
      const url = URL.createObjectURL(blob);
      if (lineArtPreview) URL.revokeObjectURL(lineArtPreview);
      setLineArtPreview(url);
      setLineArtBlob(blob);
      setFeedback("Line art ready. Download it below.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Conversion failed.");
    } finally {
      setIsWorking(false);
    }
  };

  const onDownload = () => {
    if (!lineArtBlob) return;
    const url = URL.createObjectURL(lineArtBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dunamis-line-art-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const clearColoring = () => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFeedback("Canvas cleared.");
  };

  const downloadColored = async () => {
    const paint = paintCanvasRef.current;
    const outline = outlineImageRef.current;
    if (!paint || !outline) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1000;
    exportCanvas.height = 1000;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(paint, 0, 0, exportCanvas.width, exportCanvas.height);
    if (outline.complete) {
      ctx.drawImage(outline, 0, 0, exportCanvas.width, exportCanvas.height);
    }
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `dunamis-colored-${selectedTemplate.id}-${Date.now()}.png`);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const downloadSvgTemplate = (template: SvgTemplate) => {
    triggerDownload(template.path, `${template.id}.svg`);
  };

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setFeedback("Prompt copied.");
    } catch {
      setFeedback("Copy failed.");
    }
  };

  const optimizePrompt = (prompt: string) => {
    loadPrompt(prompt);
    setLocation("/?focus=optimizer");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),rgba(0,0,0,0.94)_45%,rgba(0,0,0,1)_80%)]" />
      <div className="relative z-10 px-4 py-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Lab</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Coloring Studio</h1>
            <p className="text-sm text-gray-300 max-w-4xl">
              Turn any photo into printable black-and-white line art directly in the browser. No API key,
              no paid credits, no server upload required.
            </p>
            <p className="text-sm text-yellow-200/90 max-w-4xl">
              Neon-era creativity, modern precision: build clean coloring pages from your own photos in seconds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/starter-packs">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Starter Packs
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/60 p-5 md:p-6 shadow-lg space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">How to use</p>
          <p className="text-sm text-gray-300">1. Pick a teddy/bunny style image in Live Coloring.</p>
          <p className="text-sm text-gray-300">2. Color directly in your browser and download.</p>
          <p className="text-sm text-gray-300">3. Or upload your own photo and convert to line art.</p>
          <p className="text-xs text-gray-400">Tip: clear photos with strong contrast produce the best outlines.</p>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/60 p-5 md:p-6 shadow-lg space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Choose Your Mode</p>
          <div className="flex flex-wrap items-center gap-2">
            <a href="#photo-to-line-art">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Photo to Line Art
              </Button>
            </a>
            <a href="#live-coloring-book">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Live Coloring Book
              </Button>
            </a>
            <a href="#toy-factory-frameworks">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Use Starter Prompts
              </Button>
            </a>
          </div>
          <p className="text-xs text-gray-400">
            You have three options: color live, convert your own image, or use prebuilt prompt frameworks.
          </p>
        </div>

        <section id="live-coloring-book" className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Live Coloring Book</p>
            <p className="text-xs text-gray-400">Pick a template, color it, download it</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {SVG_TEMPLATES.map((template) => (
                  <Button
                    key={`pick-${template.id}`}
                    size="sm"
                    variant={template.id === selectedTemplateId ? "default" : "outline"}
                    className={
                      template.id === selectedTemplateId
                        ? "bg-yellow-400 text-black hover:bg-yellow-300"
                        : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    }
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-gray-300 flex items-center gap-2">
                  Color
                  <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
                </label>
                <label className="text-xs text-gray-300 flex items-center gap-2">
                  Brush
                  <input
                    type="range"
                    min={4}
                    max={48}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="accent-yellow-400"
                  />
                  <span>{brushSize}</span>
                </label>
                <Button
                  size="sm"
                  variant={isEraser ? "default" : "outline"}
                  className={isEraser ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
                  onClick={() => setIsEraser((prev) => !prev)}
                >
                  {isEraser ? "Eraser On" : "Eraser Off"}
                </Button>
                <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={clearColoring}>
                  Clear
                </Button>
                <Button size="sm" className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={downloadColored}>
                  Download Colored PNG
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-yellow-500/20 bg-black/35 p-2">
              <div className="relative aspect-square bg-white rounded-md overflow-hidden">
                <canvas
                  ref={paintCanvasRef}
                  className="absolute inset-0 h-full w-full touch-none"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
                <img
                  ref={outlineImageRef}
                  src={selectedTemplate.path}
                  alt={`${selectedTemplate.name} outline`}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </section>

        <div id="photo-to-line-art" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Photo to Line Art</p>

            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Upload image (JPG/PNG/WebP)</span>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onSelectFile}
                className="bg-black/40 border-yellow-500/30 text-white file:text-white file:bg-yellow-500/20 file:border-0 file:rounded file:px-3 file:py-1"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Line sensitivity</span>
                <span className="text-xs text-yellow-200">{threshold}</span>
              </div>
              <input
                type="range"
                min={40}
                max={220}
                step={1}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Line thickness</span>
                <span className="text-xs text-yellow-200">{thickness}</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={thickness}
                onChange={(event) => setThickness(Number(event.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={onConvert} disabled={!file || isWorking}>
                {isWorking ? "Converting..." : "Convert to Line Art"}
              </Button>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={onDownload}
                disabled={!lineArtBlob}
              >
                Download PNG
              </Button>
            </div>

            {feedback && <p className="text-xs text-yellow-200">{feedback}</p>}
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Preview</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-yellow-500/20 bg-black/35 p-2 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-200/80">Original</p>
                <div className="aspect-square bg-black/50 rounded-md overflow-hidden flex items-center justify-center">
                  {sourcePreview ? (
                    <img src={sourcePreview} alt="Original upload" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-xs text-gray-500 px-4 text-center">Upload an image to preview.</p>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-yellow-500/20 bg-black/35 p-2 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-200/80">Line Art</p>
                <div className="aspect-square bg-white rounded-md overflow-hidden flex items-center justify-center">
                  {lineArtPreview ? (
                    <img src={lineArtPreview} alt="Line art output" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-xs text-gray-500 px-4 text-center">Your converted line art appears here.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="toy-factory-frameworks" className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Toy Factory Frameworks</p>
            <p className="text-xs text-gray-400">{chosenPresetLabel}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sortedPresets.map((preset) => (
              <div key={preset.id} className="rounded-md border border-yellow-500/20 bg-black/35 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-yellow-200">{preset.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">{preset.ageGroup}</span>
                    <span className={`text-[10px] uppercase tracking-[0.15em] rounded-full border px-2 py-0.5 ${badgeClass(preset.difficulty)}`}>
                      {preset.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-300 break-words">{preset.prompt}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                    onClick={() => copyPrompt(preset.prompt)}
                  >
                    Copy Prompt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                    onClick={() => optimizePrompt(preset.prompt)}
                  >
                    Optimize
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Starter SVG Collection</p>
            <p className="text-xs text-gray-400">Ready to download and upload</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SVG_TEMPLATES.map((template) => (
              <div key={template.id} className="rounded-md border border-yellow-500/20 bg-black/35 p-3 space-y-2">
                <div className="aspect-square rounded-md bg-white overflow-hidden border border-yellow-500/20">
                  <img src={template.path} alt={`${template.name} coloring template`} className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-yellow-200">{template.name}</p>
                  <span className={`text-[10px] uppercase tracking-[0.15em] rounded-full border px-2 py-0.5 ${badgeClass(template.level)}`}>
                    {template.level}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => downloadSvgTemplate(template)}
                >
                  Download SVG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  Color This
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Free Workflow</p>
          <p className="text-sm text-gray-300">1. Generate line art (Bing / Playground / Leonardo / Mage).</p>
          <p className="text-sm text-gray-300">2. Clean black-white contrast (Photopea Threshold).</p>
          <p className="text-sm text-gray-300">3. Export SVG and fix gaps (Inkscape).</p>
          <p className="text-sm text-gray-300">4. Upload final SVG to your Dunamis Coloring Studio collection.</p>
        </section>
      </div>
    </div>
  );
}
