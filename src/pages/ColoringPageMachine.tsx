import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AgeGroupKey = "3-5" | "6-8" | "9-12" | "13-17" | "18+";
type ModeKey = "random" | "user-picture";

type OutputBlock = {
  finalPrompt: string;
  negativePrompt: string;
  styleSettings: string;
};

const AGE_GROUPS: Array<{ key: AgeGroupKey; label: string; guidance: string }> = [
  {
    key: "3-5",
    label: "Ages 3-5 (Very Simple)",
    guidance: "Very simple shapes, big open spaces, thick bold outlines, minimal background, cute and friendly.",
  },
  {
    key: "6-8",
    label: "Ages 6-8 (Simple Scene)",
    guidance: "Simple scene with moderate detail, clear separations for coloring, large readable regions.",
  },
  {
    key: "9-12",
    label: "Ages 9-12 (Balanced Detail)",
    guidance: "More structured scene detail, balanced complexity, clean boundaries between regions.",
  },
  {
    key: "13-17",
    label: "Ages 13-17 (Stylized Medium-High)",
    guidance: "Medium-high detail, stylized composition, richer environment detail, still clean linework.",
  },
  {
    key: "18+",
    label: "Adults (Intricate)",
    guidance: "High-detail intricate line art, decorative patterns and textures, relaxing composition.",
  },
];

const RANDOM_SUBJECTS = [
  "friendly forest animals picnic scene",
  "castle on a hill with clouds and flags",
  "space explorer with planets and stars",
  "underwater coral reef with fish",
  "dragon flying above mountains",
  "flower garden with butterflies",
  "robot city street adventure",
  "jungle temple with vines",
  "cozy village in autumn",
  "magical treehouse at sunset",
];

function getAgeGuidance(age: AgeGroupKey): string {
  return AGE_GROUPS.find((item) => item.key === age)?.guidance || AGE_GROUPS[2].guidance;
}

function sanitize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildOutput(params: {
  age: AgeGroupKey;
  theme: string;
  details: string;
  mode: ModeKey;
  pictureDescription: string;
  isVariant: boolean;
  originalPrompt: string;
}): OutputBlock {
  const ageGuidance = getAgeGuidance(params.age);
  const baseTheme = sanitize(params.theme) || "creative printable scene";
  const detailChunk = sanitize(params.details);
  const modeChunk =
    params.mode === "user-picture" && sanitize(params.pictureDescription)
      ? `Main reference concept: ${sanitize(params.pictureDescription)}. Convert this concept into printable line art.`
      : "Create a fresh original composition around the theme with clear silhouette readability.";
  const variantChunk = params.isVariant
    ? `Make a clearly different composition from the previous version. Previous prompt context: ${sanitize(params.originalPrompt) || "none provided"}.`
    : "This is the primary version.";

  const finalPrompt = [
    `Black-and-white printable coloring page, theme: ${baseTheme}.`,
    `Age guidance: ${ageGuidance}`,
    modeChunk,
    detailChunk ? `Specific user details: ${detailChunk}.` : "",
    variantChunk,
    "Line art only, clean crisp outlines, white background, no fill colors.",
    "No grayscale, no shading, no gradients, no textures that reduce print clarity.",
    "No text, no watermark, no logo, no signature.",
    "Centered and balanced composition with clear region boundaries for coloring.",
    "Print-ready high-resolution style, 8.5x11 / A4-friendly framing.",
  ]
    .filter(Boolean)
    .join(" ");

  const negativePrompt =
    "color, grayscale, shading, shadows, gradients, halftone, blurry lines, sketchy rough lines, low contrast, text, letters, numbers, watermark, signature, logo, photorealistic rendering, messy background clutter";

  const styleSettings = [
    "Style: pure black line art on white background",
    "Line weight: medium-bold outer lines, clean inner detail lines",
    "Composition: single-page printable framing",
    "Complexity: matched to selected age group",
    "Safety: family-friendly, non-violent",
  ].join("\n");

  return { finalPrompt, negativePrompt, styleSettings };
}

export default function ColoringPageMachine() {
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>("9-12");
  const [theme, setTheme] = useState("");
  const [details, setDetails] = useState("");
  const [mode, setMode] = useState<ModeKey>("random");
  const [pictureDescription, setPictureDescription] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [result, setResult] = useState<OutputBlock | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [printImageUrl, setPrintImageUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [generatedObjectUrl, setGeneratedObjectUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const ageGuidance = useMemo(() => getAgeGuidance(ageGroup), [ageGroup]);
  const apiBase = ((import.meta as any).env?.VITE_API_BASE || "").replace(/\/+$/, "");
  const coloringApiUrl = apiBase ? `${apiBase}/api/coloring/outline` : "/api/coloring/outline";

  useEffect(() => {
    return () => {
      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl);
      }
    };
  }, [generatedObjectUrl]);

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 1800);
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showCopyFeedback("Copied.");
    } catch {
      showCopyFeedback("Copy failed.");
    }
  };

  const pickRandomTheme = () => {
    const choice = RANDOM_SUBJECTS[Math.floor(Math.random() * RANDOM_SUBJECTS.length)];
    setTheme(choice);
  };

  const generatePrimary = () => {
    const output = buildOutput({
      age: ageGroup,
      theme,
      details,
      mode,
      pictureDescription,
      isVariant: false,
      originalPrompt: "",
    });
    setResult(output);
    setOriginalPrompt(output.finalPrompt);
  };

  const regenerateVariant = () => {
    const output = buildOutput({
      age: ageGroup,
      theme,
      details,
      mode,
      pictureDescription,
      isVariant: true,
      originalPrompt,
    });
    setResult(output);
    setOriginalPrompt(output.finalPrompt);
  };

  const handlePrintPdf = () => {
    if (!result) return;
    setPrintImageUrl(imageUrl.trim());
    window.print();
  };

  const handleImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setUploadedImage(file);
    if (file) {
      setGenMessage(`Selected: ${file.name}`);
    }
  };

  const convertUploadedToOutline = async () => {
    if (!result || generatingImage) return;
    if (!uploadedImage) {
      setGenMessage("Upload a photo first.");
      return;
    }

    setGeneratingImage(true);
    setGenMessage(null);

    try {
      const body = new FormData();
      body.append("image", uploadedImage);
      body.append("ageGroup", ageGroup);
      body.append("theme", theme.trim());
      body.append("details", details.trim());

      const response = await fetch(coloringApiUrl, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        let errorMessage = "Conversion failed. Please try a different image.";
        try {
          const payload = await response.json();
          if (payload?.error) {
            errorMessage = payload.error;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl);
      }
      setGeneratedObjectUrl(objectUrl);
      setImageUrl(objectUrl);
      setPrintImageUrl(objectUrl);
      setGenMessage("Outline generated from your uploaded photo.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conversion failed. Please try again.";
      setGenMessage(message);
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <style>{`
        @media print {
          body {
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-shell {
            background: #fff !important;
            color: #000 !important;
            border: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-textarea {
            border: 1px solid #ddd !important;
            color: #000 !important;
            background: #fff !important;
          }
        }
      `}</style>
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),rgba(0,0,0,0.94)_45%,rgba(0,0,0,1)_80%)]" />
      <div className="relative z-10 px-4 py-10 max-w-6xl mx-auto space-y-8 print-shell">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Beta</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Coloring Page Machine</h1>
            <p className="text-sm text-gray-300 max-w-3xl">
              Generate one high-quality printable coloring page prompt at a time. Designed for
              clean line art quality and age-appropriate complexity.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/65 p-5 md:p-6 shadow-lg space-y-4 no-print">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/80">How This Beta Works</p>
          <p className="text-sm text-gray-300">1. Pick age group + theme.</p>
          <p className="text-sm text-gray-300">2. Click Generate Prompt.</p>
          <p className="text-sm text-gray-300">3. Upload a photo and click Convert Uploaded Photo.</p>
          <p className="text-sm text-gray-300">4. Print to PDF or copy prompts for external generators.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4 no-print">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Inputs</p>

            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Age group</span>
              <select
                value={ageGroup}
                onChange={(event) => setAgeGroup(event.target.value as AgeGroupKey)}
                className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
              >
                {AGE_GROUPS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-md border border-yellow-500/20 bg-black/35 p-3">
              <p className="text-xs text-yellow-200 mb-1">Complexity profile</p>
              <p className="text-sm text-gray-300">{ageGuidance}</p>
            </div>

            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Theme</span>
              <div className="flex gap-2">
                <Input
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="e.g. dinosaurs, castles, jungle animals"
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={pickRandomTheme}
                >
                  Random
                </Button>
              </div>
            </label>

            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Upload photo to convert into coloring outline</span>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleImagePick}
                className="bg-black/40 border-yellow-500/30 text-white file:text-white file:bg-yellow-500/20 file:border-0 file:rounded file:px-3 file:py-1"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Generated image URL (optional manual paste)</span>
              <Input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://... (paste generated coloring page image URL)"
                className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Extra details (optional)</span>
              <Textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                placeholder="Add mood, subject details, style notes..."
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs text-gray-300">Mode</span>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "random"}
                    onChange={() => setMode("random")}
                  />
                  Random composition
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "user-picture"}
                    onChange={() => setMode("user-picture")}
                  />
                  From my picture description
                </label>
              </div>
            </div>

            {mode === "user-picture" && (
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Picture description</span>
                <Textarea
                  value={pictureDescription}
                  onChange={(event) => setPictureDescription(event.target.value)}
                  className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                  placeholder="Describe the image you want converted into line art..."
                />
              </label>
            )}

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={generatePrimary}>
                Generate Prompt
              </Button>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={regenerateVariant}
                disabled={!result}
              >
                Regenerate Variant
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Output</p>
            {!result ? (
              <p className="text-sm text-gray-400">Generate a prompt to see output sections here.</p>
            ) : (
              <>
                {printImageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-200">Generated Coloring Page</p>
                    <div className="rounded-md border border-yellow-500/20 bg-black/40 p-2">
                      <img
                        src={printImageUrl}
                        alt="Generated coloring page"
                        className="w-full max-h-[560px] object-contain bg-white rounded"
                      />
                    </div>
                  </div>
                )}
                <div className="no-print flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={convertUploadedToOutline}
                    disabled={generatingImage || !uploadedImage}
                  >
                    {generatingImage ? "Converting..." : "Convert Uploaded Photo"}
                  </Button>
                  <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={handlePrintPdf}>
                    Print to PDF
                  </Button>
                  <p className="text-xs text-gray-400">Saves this output as a printable worksheet/prompt sheet.</p>
                </div>
                {genMessage && <p className="no-print text-xs text-yellow-200">{genMessage}</p>}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">1) FINAL IMAGE PROMPT</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2 no-print"
                      onClick={() => copyText(result.finalPrompt)}
                    >
                      Copy
                    </Button>
                  </div>
                  <Textarea value={result.finalPrompt} readOnly className="min-h-[220px] bg-black/40 border-yellow-500/20 text-white print-textarea" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">2) NEGATIVE PROMPT</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2 no-print"
                      onClick={() => copyText(result.negativePrompt)}
                    >
                      Copy
                    </Button>
                  </div>
                  <Textarea value={result.negativePrompt} readOnly className="min-h-[100px] bg-black/40 border-yellow-500/20 text-white print-textarea" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">3) STYLE SETTINGS</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2 no-print"
                      onClick={() => copyText(result.styleSettings)}
                    >
                      Copy
                    </Button>
                  </div>
                  <Textarea value={result.styleSettings} readOnly className="min-h-[120px] bg-black/40 border-yellow-500/20 text-white print-textarea" />
                </div>
              </>
            )}
            {copyFeedback && (
              <div className="text-xs text-yellow-200">{copyFeedback}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
