import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { addDoc, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type SongOutput = {
  titles: string[];
  verse1: string;
  chorus: string;
  fullLyrics: string;
  stylePrompt: string;
  sunoPasteBlock: string;
  readiness: {
    score: number;
    checks: Array<{ label: string; pass: boolean }>;
  };
};

type SongJsonOutput = {
  titles?: string[];
  verse1?: string;
  chorus?: string;
  fullLyrics?: string;
  stylePrompt?: string;
};

type SongPreset = {
  id: string;
  label: string;
  idea: string;
  genre: string;
  mood: string;
  voice: string;
  energy: string;
  bpm: string;
  length: "standard" | "extended";
  perspective: "first-person" | "third-person";
  themeKeywords: string;
};

const PRESETS: SongPreset[] = [
  {
    id: "radio-pop",
    label: "Radio Pop",
    idea: "a comeback anthem about rebuilding confidence after setbacks",
    genre: "modern pop with cinematic lift",
    mood: "uplifting",
    voice: "clean emotional lead vocal",
    energy: "high",
    bpm: "118",
    length: "standard",
    perspective: "first-person",
    themeKeywords: "comeback, confidence, growth",
  },
  {
    id: "reggae-fusion",
    label: "Reggae Fusion",
    idea: "resilience under pressure while staying grounded",
    genre: "reggae-fusion with modern hip-hop drums and dub textures",
    mood: "reflective",
    voice: "melodic rap verse with sung hook",
    energy: "medium",
    bpm: "96",
    length: "extended",
    perspective: "first-person",
    themeKeywords: "resilience, pressure, calm strength",
  },
  {
    id: "trap-soul",
    label: "Trap Soul",
    idea: "late-night honesty about trust and ambition",
    genre: "trap soul with atmospheric pads and punchy 808s",
    mood: "dark",
    voice: "intimate lead with soft harmonies",
    energy: "medium",
    bpm: "134",
    length: "standard",
    perspective: "first-person",
    themeKeywords: "trust, ambition, confession",
  },
  {
    id: "cinematic-alt",
    label: "Cinematic Alt",
    idea: "fighting through chaos to protect what matters",
    genre: "cinematic alternative with hybrid orchestral drums",
    mood: "energetic",
    voice: "powerful lead with dramatic phrasing",
    energy: "high",
    bpm: "110",
    length: "extended",
    perspective: "third-person",
    themeKeywords: "protection, chaos, purpose",
  },
];

const SUNO_RULESET = [
  "Keep hook short and memorable (1-2 concise lines).",
  "Use clear section labels: Verse, Chorus, Bridge, Outro.",
  "Style prompt must include genre, mood, energy, BPM, vocal style.",
  "Avoid artist-name imitation and filler lines.",
  "Keep lyric language singable and direct.",
];

const MOOD_WORDS: Record<string, string[]> = {
  uplifting: ["rising", "golden", "hopeful", "steady", "open-sky"],
  dark: ["shadowed", "heavy", "cold", "restless", "neon-night"],
  romantic: ["warm", "close", "midnight", "soft", "timeless"],
  energetic: ["driving", "fast", "electric", "punchy", "explosive"],
  chill: ["smooth", "lazy", "sunset", "floating", "calm"],
  reflective: ["quiet", "late-night", "honest", "faded", "distant"],
};

const HOOKS = [
  "We keep moving when the pressure gets loud",
  "Turn the silence into something that roars",
  "Hold the line till the daylight breaks",
  "We were built to rise through the noise",
  "No shortcuts, just fire in the work",
];

const OPENERS = [
  "Streetlights paint the window while the city stays awake",
  "Another long run, heart heavy but the engine never quits",
  "Dust in the speakers, old dreams in a new frame",
  "Late call, cold rain, one chance left on the line",
  "Neon on the pavement, faith in the rhythm",
];

const SONG_SYSTEM_PROMPT =
  "ROLE: You are a professional songwriter and prompt engineer for Suno.\n" +
  "TASK: Generate high-quality, original song assets from user inputs.\n" +
  "OUTPUT FORMAT: Return ONLY valid JSON with this shape:\n" +
  "{\n" +
  '  "titles": ["...", "...", "..."],\n' +
  '  "verse1": "...",\n' +
  '  "chorus": "...",\n' +
  '  "fullLyrics": "...",\n' +
  '  "stylePrompt": "..."\n' +
  "}\n" +
  "RULES:\n" +
  "- Keep lyrics original and singable.\n" +
  "- Use section labels in fullLyrics: [Verse 1], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro].\n" +
  "- No artist-name imitation.\n" +
  "- Avoid repetitive filler lines.\n" +
  "- stylePrompt must include genre, mood, energy, BPM, and vocal style.\n" +
  "- Return JSON only. No markdown, no explanations.";

function sanitize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function uniqueLines(text: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const key = line.trim().toLowerCase();
    if (!key) {
      out.push(line);
      continue;
    }
    if (seen.has(key)) {
      out.push(`${line} (variation)`);
      continue;
    }
    seen.add(key);
    out.push(line);
  }
  return out.join("\n");
}

function line(seed: number, mood: string, theme: string, perspective: string) {
  const moodPool = MOOD_WORDS[mood] || MOOD_WORDS.reflective;
  const moodWord = pick(moodPool, seed + 3);
  const opener = pick(OPENERS, seed + 5);
  const framing = perspective === "third-person" ? "they keep" : "I keep";
  return `${opener}, ${moodWord} around the edges, ${framing} chasing ${theme}.`;
}

function makeVerse(seed: number, mood: string, theme: string, voice: string, perspective: string) {
  return [
    line(seed, mood, theme, perspective),
    `Every step is ${pick(["measured", "reckless", "careful", "hungry"], seed + 11)}, but the vision stays clear.`,
    `I hear ${voice} in the static, telling me not to disappear.`,
    `If this is the cost of becoming, then we pay and persevere.`,
  ].join("\n");
}

function makeChorus(seed: number, theme: string, hookStyle: string) {
  const hook = pick(HOOKS, seed + 7);
  const chorus = [
    `${hook},`,
    hookStyle === "short" ? "hands up, we do not fold tonight," : "hands up to the sky, we do not fold tonight,",
    "all this weight turns light when we call it by name,",
    `we came too far to leave without a flame for ${theme}.`,
  ].join("\n");
  return chorus;
}

function buildReadiness(params: {
  genre: string;
  mood: string;
  voice: string;
  bpm: string;
  chorus: string;
  fullLyrics: string;
}): SongOutput["readiness"] {
  const checks = [
    { label: "Genre set", pass: Boolean(sanitize(params.genre)) },
    { label: "Mood set", pass: Boolean(sanitize(params.mood)) },
    { label: "Vocal style set", pass: Boolean(sanitize(params.voice)) },
    { label: "BPM set", pass: Boolean(sanitize(params.bpm)) },
    { label: "Hook is concise", pass: params.chorus.split("\n")[0].split(" ").length <= 12 },
    { label: "Sections included", pass: /\[Verse 1\]/.test(params.fullLyrics) && /\[Chorus\]/.test(params.fullLyrics) && /\[Bridge\]/.test(params.fullLyrics) },
  ];
  const passCount = checks.filter((c) => c.pass).length;
  return { score: Math.round((passCount / checks.length) * 100), checks };
}

function buildSong(params: {
  idea: string;
  genre: string;
  mood: string;
  voice: string;
  energy: string;
  bpm: string;
  length: "standard" | "extended";
  perspective: "first-person" | "third-person";
  hookStyle: "short" | "anthemic";
  themeKeywords: string;
  variant: number;
}): SongOutput {
  const idea = sanitize(params.idea) || "a comeback story";
  const genre = sanitize(params.genre) || "cinematic pop";
  const mood = sanitize(params.mood).toLowerCase() || "reflective";
  const voice = sanitize(params.voice) || "raw lead vocal";
  const energy = sanitize(params.energy) || "medium";
  const bpm = sanitize(params.bpm) || "118";
  const keywords = sanitize(params.themeKeywords);
  const seed = `${idea}|${genre}|${mood}|${voice}|${energy}|${params.variant}|${keywords}`
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  const verse1 = makeVerse(seed, mood, idea, voice, params.perspective);
  const chorus = makeChorus(seed, idea, params.hookStyle);
  const verse2 = makeVerse(seed + 13, mood, idea, voice, params.perspective);
  const bridge = [
    "Strip it back, let the room breathe.",
    "One note, one truth, one reason we stayed.",
    "Then hit the lift and bring the skyline with us.",
  ].join("\n");
  const outro = [
    "Fade on harmonies, leave the final word hanging.",
    "Repeat the hook softly, then end clean.",
  ].join("\n");

  const fullLyricsRaw = [
    "[Verse 1]",
    verse1,
    "",
    "[Chorus]",
    chorus,
    "",
    "[Verse 2]",
    verse2,
    "",
    "[Chorus]",
    chorus,
    "",
    "[Bridge]",
    bridge,
    "",
    "[Final Chorus]",
    chorus,
    "",
    params.length === "extended"
      ? "[Verse 3]\n" + makeVerse(seed + 29, mood, idea, voice, params.perspective) + "\n\n[Final Chorus]\n" + chorus
      : "",
    "",
    "[Outro]",
    outro,
  ]
    .filter(Boolean)
    .join("\n");

  const fullLyrics = uniqueLines(fullLyricsRaw);

  const titles = [
    `${pick(["Neon", "Midnight", "Gold", "Static", "Afterlight"], seed)} ${pick(["Promise", "Signal", "Drive", "Echo", "Rise"], seed + 2)}`,
    `${pick(["Hold", "Carry", "Light", "Fire", "Storm"], seed + 4)} the ${pick(["Line", "Noise", "Night", "Weight", "Flame"], seed + 6)}`,
    `${pick(["No", "Last", "One", "Final", "Open"], seed + 8)} ${pick(["Surrender", "Call", "Chance", "Motion", "Signal"], seed + 10)}`,
  ];

  const stylePrompt = [
    `${genre}, ${mood} mood, ${energy} energy, ${bpm} BPM.`,
    `Lead voice style: ${voice}.`,
    keywords ? `Theme keywords: ${keywords}.` : "",
    "Modern radio-ready mix, clean hook, strong emotional build.",
    "Avoid generic filler lines and avoid artist-name imitation.",
  ]
    .filter(Boolean)
    .join(" ");

  const sunoPasteBlock = [
    "STYLE / PROMPT:",
    stylePrompt,
    "",
    "LYRICS:",
    fullLyrics,
    "",
    "NOTES:",
    "- Keep the chorus memorable and clear.",
    "- Keep vocals centered and intelligible.",
    "- Avoid clipping or muddy low-end.",
  ].join("\n");

  const readiness = buildReadiness({
    genre,
    mood,
    voice,
    bpm,
    chorus,
    fullLyrics,
  });

  return { titles, verse1, chorus, fullLyrics, stylePrompt, sunoPasteBlock, readiness };
}

function extractJsonObject(raw: string): SongJsonOutput | null {
  const text = raw.trim();
  try {
    return JSON.parse(text) as SongJsonOutput;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as SongJsonOutput;
    } catch {
      return null;
    }
  }
}

function extractSection(fullLyrics: string, section: string): string {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)`, "i");
  const match = regex.exec(fullLyrics);
  return match?.[1]?.trim() || "";
}

function mergeAiSongWithFallback(
  ai: SongJsonOutput | null,
  fallback: SongOutput,
  setup: { genre: string; mood: string; voice: string; bpm: string },
): SongOutput {
  if (!ai) return fallback;

  const titles =
    Array.isArray(ai.titles) && ai.titles.length > 0
      ? ai.titles
          .map((item) => sanitize(String(item)))
          .filter(Boolean)
          .slice(0, 3)
      : fallback.titles;
  const fullLyrics = sanitize(ai.fullLyrics || "") ? String(ai.fullLyrics) : fallback.fullLyrics;
  const verse1 =
    sanitize(ai.verse1 || "") ||
    extractSection(fullLyrics, "Verse 1") ||
    fallback.verse1;
  const chorus =
    sanitize(ai.chorus || "") ||
    extractSection(fullLyrics, "Chorus") ||
    fallback.chorus;
  const stylePrompt = sanitize(ai.stylePrompt || "") || fallback.stylePrompt;

  const sunoPasteBlock = [
    "STYLE / PROMPT:",
    stylePrompt,
    "",
    "LYRICS:",
    fullLyrics,
    "",
    "NOTES:",
    "- Keep the chorus memorable and clear.",
    "- Keep vocals centered and intelligible.",
    "- Avoid clipping or muddy low-end.",
  ].join("\n");

  const readiness = buildReadiness({
    genre: setup.genre,
    mood: setup.mood,
    voice: setup.voice,
    bpm: setup.bpm,
    chorus,
    fullLyrics,
  });

  return {
    titles: titles.length ? titles : fallback.titles,
    verse1,
    chorus,
    fullLyrics,
    stylePrompt,
    sunoPasteBlock,
    readiness,
  };
}

export default function SunoSongMachine() {
  const { user } = useAuth();
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("uplifting");
  const [voice, setVoice] = useState("");
  const [energy, setEnergy] = useState("medium");
  const [bpm, setBpm] = useState("118");
  const [length, setLength] = useState<"standard" | "extended">("standard");
  const [perspective, setPerspective] = useState<"first-person" | "third-person">("first-person");
  const [hookStyle, setHookStyle] = useState<"short" | "anthemic">("short");
  const [themeKeywords, setThemeKeywords] = useState("");
  const [variant, setVariant] = useState(0);
  const [result, setResult] = useState<SongOutput | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineInfo, setEngineInfo] = useState<string>("");

  const canGenerate = useMemo(() => sanitize(idea).length > 2, [idea]);
  const qualityScore = result?.readiness.score ?? null;
  const isWeakResult = qualityScore !== null && qualityScore < 75;
  const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim();
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/optimize` : "/api/optimize";

  const trackEvent = async (eventType: string, meta: Record<string, string> = {}) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, "users", user.uid, "songUsageEvents"), {
        eventType,
        meta,
        createdAt: Date.now(),
      });
    } catch {
      // analytics must never block user flow
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingIdea = params.get("idea");
    if (incomingIdea && !idea) {
      setIdea(incomingIdea);
      setMessage("Template loaded from Starter Pack.");
      window.setTimeout(() => setMessage(null), 1800);
    }

    const fromDraft = params.get("fromDraft");
    if (!fromDraft) return;
    const draftIdea = params.get("draftIdea");
    const draftGenre = params.get("draftGenre");
    const draftMood = params.get("draftMood");
    const draftVoice = params.get("draftVoice");
    const draftEnergy = params.get("draftEnergy");
    const draftBpm = params.get("draftBpm");
    const draftLength = params.get("draftLength");
    if (draftIdea) setIdea(draftIdea);
    if (draftGenre) setGenre(draftGenre);
    if (draftMood) setMood(draftMood);
    if (draftVoice) setVoice(draftVoice);
    if (draftEnergy) setEnergy(draftEnergy);
    if (draftBpm) setBpm(draftBpm);
    if (draftLength === "standard" || draftLength === "extended") setLength(draftLength);
    setMessage("Song draft loaded from profile.");
    window.setTimeout(() => setMessage(null), 2000);
  }, [idea]);

  const copy = async (value: string, ok = "Copied.", eventType = "copy") => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(ok);
      window.setTimeout(() => setMessage(null), 1600);
      await trackEvent(eventType, { mode: "song-architect-v2" });
    } catch {
      setMessage("Copy failed.");
      window.setTimeout(() => setMessage(null), 1600);
    }
  };

  const generate = async (nextVariant = variant) => {
    const fallback = buildSong({
      idea,
      genre,
      mood,
      voice,
      energy,
      bpm,
      length,
      perspective,
      hookStyle,
      themeKeywords,
      variant: nextVariant,
    });
    setIsGenerating(true);
    try {
      const songBrief = [
        `Idea: ${sanitize(idea) || "a comeback story"}`,
        `Genre: ${sanitize(genre) || "cinematic pop"}`,
        `Mood: ${sanitize(mood) || "reflective"}`,
        `Energy: ${sanitize(energy) || "medium"}`,
        `BPM: ${sanitize(bpm) || "118"}`,
        `Vocal style: ${sanitize(voice) || "raw lead vocal"}`,
        `Perspective: ${perspective}`,
        `Hook style: ${hookStyle}`,
        `Length: ${length}`,
        sanitize(themeKeywords) ? `Theme keywords: ${sanitize(themeKeywords)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SONG_SYSTEM_PROMPT,
          prompt: songBrief,
          context:
            "Create radio-quality lyrics suitable for Suno. Keep phrasing natural. Avoid cliches and repeated lines.",
          userEmail: user?.email || "",
        }),
      });

      if (!response.ok) {
        setResult(fallback);
        setEngineInfo("Local fallback");
        setMessage("AI generation unavailable right now. Using local engine.");
        window.setTimeout(() => setMessage(null), 2200);
      } else {
        const data = await response.json();
        const ai = extractJsonObject(String(data?.output || ""));
        setResult(
          mergeAiSongWithFallback(ai, fallback, {
            genre: sanitize(genre),
            mood: sanitize(mood),
            voice: sanitize(voice),
            bpm: sanitize(bpm),
          }),
        );
        const provider = sanitize(String(data?.provider || ""));
        const model = sanitize(String(data?.model || ""));
        setEngineInfo([provider, model].filter(Boolean).join(" / ") || (ai ? "AI" : "Local fallback"));
        setMessage(ai ? "AI generation complete." : "AI response format was invalid. Using fallback.");
        window.setTimeout(() => setMessage(null), 2200);
      }
    } catch {
      setResult(fallback);
      setEngineInfo("Local fallback");
      setMessage("Could not reach AI model. Using local engine.");
      window.setTimeout(() => setMessage(null), 2200);
    } finally {
      setIsGenerating(false);
    }

    await trackEvent("generate_preview", {
      mood: sanitize(mood),
      energy: sanitize(energy),
      length,
      perspective,
      hookStyle,
    });
  };

  const regenerate = async () => {
    const next = variant + 1;
    setVariant(next);
    await generate(next);
    await trackEvent("regenerate_variation", {
      variation: String(next),
      mood: sanitize(mood),
      energy: sanitize(energy),
    });
  };

  const applyPreset = async (preset: SongPreset) => {
    setIdea(preset.idea);
    setGenre(preset.genre);
    setMood(preset.mood);
    setVoice(preset.voice);
    setEnergy(preset.energy);
    setBpm(preset.bpm);
    setLength(preset.length);
    setPerspective(preset.perspective);
    setThemeKeywords(preset.themeKeywords);
    setVariant(0);
    setMessage(`${preset.label} preset loaded.`);
    window.setTimeout(() => setMessage(null), 1500);
    await trackEvent("apply_preset", { preset: preset.id });
  };

  const saveDraft = async () => {
    if (!user?.uid || !result) {
      setMessage("Sign in and generate a song first.");
      window.setTimeout(() => setMessage(null), 1600);
      return;
    }
    setSavingDraft(true);
    try {
      const title = result.titles[0] || "Untitled Song Draft";
      await addDoc(collection(db, "users", user.uid, "songDrafts"), {
        title,
        idea: sanitize(idea),
        genre: sanitize(genre),
        mood: sanitize(mood),
        voice: sanitize(voice),
        energy: sanitize(energy),
        bpm: sanitize(bpm),
        length,
        perspective,
        hookStyle,
        themeKeywords: sanitize(themeKeywords),
        verse1: result.verse1,
        chorus: result.chorus,
        fullLyrics: result.fullLyrics,
        stylePrompt: result.stylePrompt,
        sunoPasteBlock: result.sunoPasteBlock,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setMessage("Song draft saved to profile.");
      window.setTimeout(() => setMessage(null), 1600);
      await trackEvent("save_draft", { title });
    } catch {
      setMessage("Could not save draft.");
      window.setTimeout(() => setMessage(null), 1600);
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),rgba(0,0,0,0.95)_45%,rgba(0,0,0,1)_80%)]" />
      <div className="relative z-10 px-4 py-10 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Architect</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Suno Song Architect v2</h1>
            <p className="text-sm text-gray-300 max-w-3xl">
              Structured song building for Suno: setup, preview, full lyrics, style prompt, and a paste-ready final block.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://suno.com/" target="_blank" rel="noopener noreferrer" onClick={() => { void trackEvent("open_suno", { source: "header" }); }}>
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300">Open Suno</Button>
            </a>
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">Back to Homepage</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/65 p-5 md:p-6 shadow-lg space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/80">Knowledge Rules</p>
            <span className="text-[10px] uppercase tracking-[0.2em] rounded-full border border-yellow-500/40 px-2 py-1 text-yellow-200">Suno Free 4.5 Ready</span>
            <span className="text-[10px] uppercase tracking-[0.2em] rounded-full border border-yellow-500/40 px-2 py-1 text-yellow-200">Suno Pro v5 Ready</span>
          </div>
          {SUNO_RULESET.map((rule, index) => (
            <p key={`${rule}-${index}`} className="text-sm text-gray-300">{index + 1}. {rule}</p>
          ))}
        </div>

        <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80 mb-3">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => { void applyPreset(preset); }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Song Setup</p>
            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Song idea</span>
              <Textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                className="min-h-[88px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                placeholder="Example: an uplifting comeback anthem about rebuilding after a hard year"
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Genre / style</span>
              <Input
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                placeholder="Example: reggae fusion, melodic rap, cinematic pop"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Mood</span>
                <select value={mood} onChange={(event) => setMood(event.target.value)} className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white">
                  <option value="uplifting">Uplifting</option>
                  <option value="dark">Dark</option>
                  <option value="romantic">Romantic</option>
                  <option value="energetic">Energetic</option>
                  <option value="chill">Chill</option>
                  <option value="reflective">Reflective</option>
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Energy</span>
                <select value={energy} onChange={(event) => setEnergy(event.target.value)} className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Vocal style</span>
                <Input
                  value={voice}
                  onChange={(event) => setVoice(event.target.value)}
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                  placeholder="male lead, female soul, duet, rap-sung blend"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Tempo (BPM)</span>
                <Input
                  value={bpm}
                  onChange={(event) => setBpm(event.target.value)}
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                  placeholder="118"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Length</span>
                <select value={length} onChange={(event) => setLength(event.target.value as "standard" | "extended")} className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white">
                  <option value="standard">Standard</option>
                  <option value="extended">Extended</option>
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Perspective</span>
                <select value={perspective} onChange={(event) => setPerspective(event.target.value as "first-person" | "third-person")} className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white">
                  <option value="first-person">First-person</option>
                  <option value="third-person">Third-person</option>
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Hook style</span>
                <select value={hookStyle} onChange={(event) => setHookStyle(event.target.value as "short" | "anthemic")} className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white">
                  <option value="short">Short hook</option>
                  <option value="anthemic">Anthemic</option>
                </select>
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Theme keywords (optional)</span>
              <Input
                value={themeKeywords}
                onChange={(event) => setThemeKeywords(event.target.value)}
                className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                placeholder="Example: resilience, redemption, late-night drive"
              />
            </label>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => { void generate(); }} disabled={!canGenerate}>
                {isGenerating ? "Generating..." : "Generate Song Pack"}
              </Button>
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={() => { void regenerate(); }} disabled={!result}>
                Regenerate Variation
              </Button>
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={saveDraft} disabled={!result || savingDraft}>
                {savingDraft ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Output</p>
            {engineInfo && (
              <p className="text-[11px] text-yellow-200/80">Engine: {engineInfo}</p>
            )}
            {!result ? (
              <p className="text-sm text-gray-400">Generate a song pack to see titles, lyrics, style prompt, and final Suno block.</p>
            ) : (
              <>
                <div className="rounded-md border border-yellow-500/20 bg-black/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Suno readiness score</p>
                    <span className="text-xs text-yellow-200">{result.readiness.score}/100</span>
                  </div>
                  {result.readiness.checks.map((check, index) => (
                    <p key={`${check.label}-${index}`} className={`text-xs ${check.pass ? "text-emerald-300" : "text-red-300"}`}>
                      {check.pass ? "PASS" : "FAIL"} - {check.label}
                    </p>
                  ))}
                </div>
                {isWeakResult && (
                  <div className="rounded-md border border-red-400/35 bg-red-500/10 p-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-red-200">Weak Draft Detected</p>
                    <p className="text-sm text-red-100">
                      This song scored {qualityScore}/100. Click regenerate to get a stronger variation.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300/40 text-red-100 hover:bg-red-400/10"
                      onClick={() => { void regenerate(); }}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "Regenerating..." : "Regenerate Variation"}
                    </Button>
                  </div>
                )}
                <div className="space-y-2 rounded-md border border-yellow-500/20 bg-black/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Title options</p>
                    <Button size="sm" variant="outline" className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2" onClick={() => { void copy(result.titles.join("\n"), "Titles copied.", "copy_titles"); }}>
                      Copy
                    </Button>
                  </div>
                  {result.titles.map((title, idx) => (
                    <p key={`${title}-${idx}`} className="text-sm text-gray-200">{idx + 1}. {title}</p>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Preview: Verse 1 + Chorus</p>
                    <Button size="sm" variant="outline" className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2" onClick={() => { void copy(`[Verse 1]\n${result.verse1}\n\n[Chorus]\n${result.chorus}`, "Preview copied.", "copy_preview"); }}>
                      Copy
                    </Button>
                  </div>
                  <Textarea value={`[Verse 1]\n${result.verse1}\n\n[Chorus]\n${result.chorus}`} readOnly className="min-h-[190px] bg-black/40 border-yellow-500/20 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Style prompt</p>
                    <Button size="sm" variant="outline" className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2" onClick={() => { void copy(result.stylePrompt, "Style prompt copied.", "copy_style_prompt"); }}>
                      Copy
                    </Button>
                  </div>
                  <Textarea value={result.stylePrompt} readOnly className="min-h-[120px] bg-black/40 border-yellow-500/20 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Suno paste block</p>
                    <Button size="sm" variant="outline" className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2" onClick={() => { void copy(result.sunoPasteBlock, "Suno block copied.", "copy_suno_block"); }}>
                      Copy
                    </Button>
                  </div>
                  <Textarea value={result.sunoPasteBlock} readOnly className="min-h-[250px] bg-black/40 border-yellow-500/20 text-white" />
                </div>
                <div className="rounded-md border border-yellow-500/20 bg-black/30 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80 mb-1">Paste Steps</p>
                  <p className="text-sm text-gray-300">1. Open Suno Create.</p>
                  <p className="text-sm text-gray-300">2. Paste STYLE / PROMPT into style description.</p>
                  <p className="text-sm text-gray-300">3. Paste LYRICS into custom lyrics.</p>
                  <p className="text-sm text-gray-300">4. Generate, then use Reuse Prompt for fast variants.</p>
                </div>
              </>
            )}
            {message && <p className="text-xs text-yellow-200">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
