import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { addDoc, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  emoji: string;
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

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: SongPreset[] = [
  {
    id: "radio-pop",
    label: "Radio Pop",
    emoji: "🎤",
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
    emoji: "🌴",
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
    emoji: "🌙",
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
    emoji: "🎬",
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
  {
    id: "rnb-soul",
    label: "R&B Soul",
    emoji: "🎵",
    idea: "finding love again after being hurt before",
    genre: "contemporary R&B with warm soul undertones",
    mood: "romantic",
    voice: "smooth falsetto with rich harmonies",
    energy: "medium",
    bpm: "88",
    length: "standard",
    perspective: "first-person",
    themeKeywords: "love, healing, vulnerability",
  },
  {
    id: "indie-folk",
    label: "Indie Folk",
    emoji: "🍂",
    idea: "leaving home and the bittersweet weight of moving on",
    genre: "indie folk with acoustic guitar and warm reverb",
    mood: "reflective",
    voice: "breathy intimate vocal",
    energy: "low",
    bpm: "78",
    length: "standard",
    perspective: "first-person",
    themeKeywords: "home, distance, memory",
  },
];

// ─── Fallback content pools (large = real variation) ─────────────────────────

const VERSE_OPENERS: Record<string, string[]> = {
  uplifting: [
    "The morning breaks like something I forgot I needed",
    "Every stumble left a scar but not a reason to quit",
    "Somewhere between the doubt and the drive I found solid ground",
    "I traded all my excuses for something harder and real",
    "The noise was loud until the signal cut through clean",
  ],
  dark: [
    "Three in the morning and the ceiling still has answers I don't",
    "There's a version of this story where I don't make it out",
    "Cold glass, warm regret, and the space where you used to be",
    "I counted every exit and still couldn't find a door",
    "The city hums but tonight it feels like static under skin",
  ],
  reflective: [
    "I've been rewriting the same old scene since I was seventeen",
    "Some roads don't lead back and honestly that's the whole point",
    "Every quiet Sunday carries the weight of what didn't happen",
    "I keep the letters but I don't keep the lies they sat inside",
    "Distance taught me more about home than living there ever did",
  ],
  romantic: [
    "You walked in like a key fitting a lock I forgot I had",
    "Something about the way the light hits when you're near",
    "I'd been running so long I almost missed when you slowed me down",
    "There's a warmth that lives between us that I can't explain away",
    "Late evenings feel different now — longer, softer, yours",
  ],
  energetic: [
    "We hit the floor before the crowd knew what was coming",
    "Fire in the chest, clock running, nothing left to lose",
    "We didn't ask for permission we just moved",
    "Every second counts when the stakes get this electric",
    "The world can spin fast — we spin faster",
  ],
  chill: [
    "Sunday afternoon and the record keeps skipping in the best way",
    "Nothing urgent, nothing sharp — just the hum of being here",
    "Slow the tempo down and let the melody do the work",
    "We don't need to rush, there's enough sky for both of us",
    "Barefoot on the floor while the playlist drifts through golden",
  ],
};

const VERSE_MIDDLES: Record<string, string[]> = {
  uplifting: [
    "I spent too long asking if I deserved it — now I just build",
    "There's a version of me that would've stopped here. He doesn't run things anymore",
    "You can't outwork the doubt but you can out-last it",
    "The people who said no gave me the clearest map forward",
  ],
  dark: [
    "I wore the mask so long I forgot the face underneath it",
    "Trust is a currency I've been spending on the wrong accounts",
    "Everyone's got a story about the night they almost didn't make it",
    "I'm not broken — I'm just built from harder material than you expected",
  ],
  reflective: [
    "The past sits quiet now, like smoke after a fire's done",
    "I don't miss the version of me that needed everyone's approval",
    "Time makes liars of the things we swore we'd never get over",
    "The truth is, I was ready to change before I said I was",
  ],
  romantic: [
    "I used to keep my heart behind a fence — you just walked through",
    "You make the ordinary feel like something worth remembering",
    "Every song I wrote before you was missing something obvious",
    "This is what it feels like when the walls come down without a fight",
  ],
  energetic: [
    "We don't slow down — we shift gears and take the long way at speed",
    "Every eye in the room and we still want more",
    "You can feel it in the bass before the chorus ever hits",
    "This is what we trained for, this is what we came to show",
  ],
  chill: [
    "No pressure, no agenda — just the two of us and the afternoon",
    "Good music and no plans — that's really all this needs to be",
    "The world keeps its speed. We found a different lane",
    "Some moments don't need a caption. Just let them be",
  ],
};

const CHORUS_HOOKS: Record<string, string[]> = {
  uplifting: [
    "We rise when it gets heavy, we shine when it gets hard",
    "Every scar's a star now, every wound a battle won",
    "I was built to last through this — watch me prove it",
    "The ceiling's just a starting point from here",
  ],
  dark: [
    "I don't need saving, I need space to feel this through",
    "The dark is honest — it never pretended to be light",
    "Some nights are the price of becoming who you are",
    "I'd rather ache in truth than smile in a comfortable lie",
  ],
  reflective: [
    "I let it go and didn't realise until it was already gone",
    "Some things only make sense when you're looking back at them",
    "The person I became was worth the mess it took to get here",
    "Not everything needs to last — some things just need to happen",
  ],
  romantic: [
    "Stay. Just stay. I'll figure out the rest",
    "You're the only thing that feels like home in a strange city",
    "I'd rewrite every bad year if you were still at the end of it",
    "This is what I was holding space for",
  ],
  energetic: [
    "Louder. Harder. We don't stop now",
    "Turn it up until the walls forget how to stand still",
    "Move like the moment depends on every single second",
    "We came to leave a mark they'll still be talking about",
  ],
  chill: [
    "Easy now — let the song take the wheel",
    "We've got time, we've got today, we've got this",
    "Drift a little. Nobody's counting the minutes here",
    "Smooth like the last hour of a perfect day",
  ],
};

const BRIDGE_LINES: Record<string, string[]> = {
  uplifting: [
    "Strip it back — just the voice and what it means",
    "This is the moment everything that hurt becomes useful",
    "One last breath before the lift. Ready.",
  ],
  dark: [
    "Quieter now. Just the truth and the room it lives in",
    "Here's the part nobody posts about — the actual cost",
    "This is what it sounds like when the armour finally comes off",
  ],
  reflective: [
    "Slow it down. Let the silence say the part I can't",
    "The bridge is where I stop pretending it was simple",
    "All of it led here. Even the parts I'd undo",
  ],
  romantic: [
    "No metaphors here — just me, just you, just this",
    "If I could say one thing without the melody — it's still you",
    "Every love song ever written was trying to say this",
  ],
  energetic: [
    "Drop the drums. One beat. Then everything hits at once",
    "This is the breath before the last run. Make it count",
    "Every note after this lands harder",
  ],
  chill: [
    "Soft now — let the reverb carry what the words can't",
    "This is the exhale. The whole song was the inhale",
    "Floating. Present. Nowhere else to be",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "for", "with", "by", "at",
  "is", "are", "was", "were", "be", "been", "being", "it", "this", "that", "from", "as",
  "we", "i", "you", "they", "he", "she", "my", "your", "our", "their", "me", "us", "them",
]);

function coreTokens(text: string): string[] {
  return sanitize(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function promptEchoRatio(idea: string, lyrics: string): number {
  const ideaTokens = new Set(coreTokens(idea));
  if (ideaTokens.size === 0) return 0;
  const lyricTokens = new Set(coreTokens(lyrics));
  let overlap = 0;
  for (const token of ideaTokens) {
    if (lyricTokens.has(token)) overlap += 1;
  }
  return overlap / ideaTokens.size;
}

function duplicateLineRatio(text: string): number {
  const lines = text
    .split("\n")
    .map((l) => sanitize(l).toLowerCase())
    .filter(Boolean);
  if (lines.length === 0) return 0;
  const seen = new Set<string>();
  let dupes = 0;
  for (const line of lines) {
    if (seen.has(line)) dupes += 1;
    else seen.add(line);
  }
  return dupes / lines.length;
}

function candidateQualityScore(song: SongOutput, idea: string): number {
  const base = song.readiness.score;
  const echoPenalty = Math.round(promptEchoRatio(idea, song.fullLyrics) * 35);
  const duplicatePenalty = Math.round(duplicateLineRatio(song.fullLyrics) * 40);
  return base - echoPenalty - duplicatePenalty;
}

function isWeakSongCandidate(song: SongOutput, idea: string): boolean {
  if (candidateQualityScore(song, idea) < 78) return true;
  if (song.readiness.score < 78) return true;
  if (promptEchoRatio(idea, song.fullLyrics) > 0.40) return true;
  if (duplicateLineRatio(song.fullLyrics) > 0.14) return true;
  return false;
}

function seededPick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[Math.abs(seed + offset) % arr.length];
}

// Generates a numeric seed from a string — much more varied than the original
function makeSeed(text: string, variant: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) + variant * 6271;
}

function uniqueLines(text: string): string {
  const seen = new Set<string>();
  return text
    .split("\n")
    .map((line) => {
      const key = line.trim().toLowerCase();
      if (!key) return line; // keep blank lines
      if (seen.has(key)) return null; // silently drop duplicates — no "(variation)" tag
      seen.add(key);
      return line;
    })
    .filter((l) => l !== null)
    .join("\n");
}

function getMoodPool(mood: string) {
  const m = mood.toLowerCase();
  return (
    VERSE_OPENERS[m] ||
    VERSE_OPENERS["reflective"]
  );
}

// ─── Lyric builders ───────────────────────────────────────────────────────────

function makeVerse(
  seed: number,
  mood: string,
  _idea: string,
  voice: string,
  perspective: string,
  offset: number
): string {
  const openers = getMoodPool(mood);
  const middles = VERSE_MIDDLES[mood.toLowerCase()] || VERSE_MIDDLES["reflective"];
  const framing = perspective === "third-person" ? "They carry" : "I carry";

  return [
    seededPick(openers, seed, offset),
    seededPick(middles, seed, offset + 3),
    `${framing} every promise like it still costs something.`,
    `The ${seededPick(["weight", "truth", "light", "sound", "cost"], seed, offset + 7)} of it never really left.`,
  ].join("\n");
}

function makeChorus(seed: number, mood: string, idea: string, hookStyle: "short" | "anthemic"): string {
  const hooks = CHORUS_HOOKS[mood.toLowerCase()] || CHORUS_HOOKS["reflective"];
  const hook = seededPick(hooks, seed, 1);
  const anchor = seededPick(["all the way home", "into the light", "through the fire", "past the noise", "to open sky"], seed, 11);
  const extendedLine = hookStyle === "anthemic"
    ? `hands up to the sky, we carry this ${anchor},`
    : `hands up — we carry this ${anchor},`;

  return [
    hook + ",",
    extendedLine,
    "every burn, every doubt, every night we almost let go,",
    "this is proof that we made it — this is everything we know.",
  ].join("\n");
}

function makeBridge(seed: number, mood: string): string {
  const lines = BRIDGE_LINES[mood.toLowerCase()] || BRIDGE_LINES["reflective"];
  return [
    seededPick(lines, seed, 2),
    seededPick(lines, seed, 5),
    "Then build back up. Louder than before.",
  ].join("\n");
}

// ─── Readiness checker ────────────────────────────────────────────────────────

function buildReadiness(params: {
  genre: string;
  mood: string;
  voice: string;
  bpm: string;
  chorus: string;
  fullLyrics: string;
}): SongOutput["readiness"] {
  const checks = [
    { label: "Genre set", pass: sanitize(params.genre).length > 0 },
    { label: "Mood set", pass: sanitize(params.mood).length > 0 },
    { label: "Vocal style set", pass: sanitize(params.voice).length > 0 },
    { label: "BPM set", pass: /^\d{2,3}$/.test(sanitize(params.bpm)) },
    { label: "Hook is concise", pass: (params.chorus.split("\n")[0] || "").split(" ").length <= 12 },
    {
      label: "All sections present",
      pass:
        /\[Verse 1\]/i.test(params.fullLyrics) &&
        /\[Chorus\]/i.test(params.fullLyrics) &&
        /\[Bridge\]/i.test(params.fullLyrics),
    },
    { label: "Lyrics have length", pass: params.fullLyrics.split("\n").filter(Boolean).length >= 16 },
  ];
  const passCount = checks.filter((c) => c.pass).length;
  return { score: Math.round((passCount / checks.length) * 100), checks };
}

// ─── Full song builder (fallback / offline) ───────────────────────────────────

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

  const seedStr = `${idea}|${genre}|${mood}|${voice}|${energy}|${keywords}`;
  const seed = makeSeed(seedStr, params.variant);

  const verse1 = makeVerse(seed, mood, idea, voice, params.perspective, 0);
  const verse2 = makeVerse(seed, mood, idea, voice, params.perspective, 17);
  const verse3 = makeVerse(seed, mood, idea, voice, params.perspective, 37);
  const chorus = makeChorus(seed, mood, idea, params.hookStyle);
  const bridge = makeBridge(seed, mood);

  const outro = [
    "Fade on harmonics. Let the last note breathe.",
    "The chorus echoes once more — softly, then silence.",
  ].join("\n");

  const sections: string[] = [
    "[Verse 1]", verse1, "",
    "[Pre-Chorus]", `Almost there — just breathe. The ${seededPick(["drop", "lift", "shift", "break"], seed, 9)} is coming.`, "",
    "[Chorus]", chorus, "",
    "[Verse 2]", verse2, "",
    "[Chorus]", chorus, "",
    "[Bridge]", bridge, "",
    "[Final Chorus]", chorus, "",
  ];

  if (params.length === "extended") {
    sections.push("[Verse 3]", verse3, "", "[Final Chorus]", chorus, "");
  }

  sections.push("[Outro]", outro);

  const fullLyricsRaw = sections.filter((s) => s !== undefined).join("\n");
  const fullLyrics = uniqueLines(fullLyricsRaw);

  const titleWords1 = ["Neon", "Midnight", "Golden", "Static", "Afterlight", "Hollow", "Infinite", "Open"];
  const titleWords2 = ["Promise", "Signal", "Drive", "Echo", "Rise", "Weight", "Flame", "Wire"];
  const titleWords3 = ["Hold", "Carry", "Light", "Fire", "Storm", "Break", "Keep", "Chase"];
  const titleWords4 = ["Line", "Noise", "Night", "Weight", "Flame", "Ground", "Shore", "Hour"];

  const titles = [
    `${seededPick(titleWords1, seed, 0)} ${seededPick(titleWords2, seed, 2)}`,
    `${seededPick(titleWords3, seed, 4)} the ${seededPick(titleWords4, seed, 6)}`,
    `${seededPick(["No", "Last", "One", "Final", "Open", "Every", "New"], seed, 8)} ${seededPick(["Surrender", "Call", "Chance", "Motion", "Signal", "Dawn", "Run"], seed, 10)}`,
  ];

  const stylePrompt = [
    `${genre}, ${mood} mood, ${energy} energy, ${bpm} BPM.`,
    `Lead voice: ${voice}.`,
    keywords ? `Theme keywords: ${keywords}.` : "",
    "Modern radio-ready mix. Clean hook. Strong emotional arc. Avoid muddy low-end and clipping.",
    "No artist-name imitation. No filler lines.",
  ]
    .filter(Boolean)
    .join(" ");

  const sunoPasteBlock = [
    "── STYLE PROMPT ──",
    stylePrompt,
    "",
    "── LYRICS ──",
    fullLyrics,
    "",
    "── PRODUCTION NOTES ──",
    "• Keep the chorus centred and clear.",
    "• Vocals up front, intelligible throughout.",
    "• Build dynamics — verse quiet, chorus open.",
    "• Avoid clipping or muddy low-end.",
  ].join("\n");

  const readiness = buildReadiness({ genre, mood, voice, bpm, chorus, fullLyrics });

  return { titles, verse1, chorus, fullLyrics, stylePrompt, sunoPasteBlock, readiness };
}

// ─── AI JSON helpers ──────────────────────────────────────────────────────────

function extractJsonObject(raw: string): SongJsonOutput | null {
  const text = raw.trim();
  try { return JSON.parse(text) as SongJsonOutput; } catch { /* fall through */ }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as SongJsonOutput; } catch { return null; }
}

function extractSection(fullLyrics: string, section: string): string {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)`, "i");
  return regex.exec(fullLyrics)?.[1]?.trim() || "";
}

function mergeAiWithFallback(
  ai: SongJsonOutput | null,
  fallback: SongOutput,
  setup: { genre: string; mood: string; voice: string; bpm: string }
): SongOutput {
  if (!ai) return fallback;

  const titles =
    Array.isArray(ai.titles) && ai.titles.length > 0
      ? ai.titles.map((t) => sanitize(String(t))).filter(Boolean).slice(0, 3)
      : fallback.titles;

  const fullLyrics = sanitize(ai.fullLyrics || "") ? String(ai.fullLyrics) : fallback.fullLyrics;
  const verse1 = sanitize(ai.verse1 || "") || extractSection(fullLyrics, "Verse 1") || fallback.verse1;
  const chorus = sanitize(ai.chorus || "") || extractSection(fullLyrics, "Chorus") || fallback.chorus;
  const stylePrompt = sanitize(ai.stylePrompt || "") || fallback.stylePrompt;

  const sunoPasteBlock = [
    "── STYLE PROMPT ──",
    stylePrompt,
    "",
    "── LYRICS ──",
    fullLyrics,
    "",
    "── PRODUCTION NOTES ──",
    "• Keep the chorus centred and clear.",
    "• Vocals up front, intelligible throughout.",
    "• Build dynamics — verse quiet, chorus open.",
    "• Avoid clipping or muddy low-end.",
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

// ─── AI system prompt ─────────────────────────────────────────────────────────

const SONG_SYSTEM_PROMPT = `ROLE: You are a world-class songwriter and Suno AI prompt engineer.
TASK: Write original, radio-quality song lyrics and a matching Suno style prompt from the brief provided.

OUTPUT FORMAT: Return ONLY valid JSON — no markdown, no explanation:
{
  "titles": ["Title One", "Title Two", "Title Three"],
  "verse1": "...",
  "chorus": "...",
  "fullLyrics": "...",
  "stylePrompt": "..."
}

LYRIC RULES:
- Use section labels exactly: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro]
- Every line must be singable — natural cadence, natural breath points
- The chorus hook must be 6–10 words, emotionally direct, instantly memorable
- No repeated lines except the chorus (which repeats as labelled)
- No clichés: no "heart on fire", "broken wings", "tears in the rain"
- No artist-name imitation
- Write with imagery and specificity — avoid vague filler
- Bridge should contrast the chorus emotionally (quieter, rawer, more honest)

STYLE PROMPT RULES:
- Must include: genre, mood, energy level, BPM, vocal style
- Keep under 120 words
- No artist names`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SunoSongMachine() {
  const { user } = useAuth(); // ← FIXED: was useAuth() with no destructure

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
  const [activeTab, setActiveTab] = useState<"lyrics" | "suno">("lyrics");
  const abortRef = useRef<AbortController | null>(null);

  const canGenerate = useMemo(() => sanitize(idea).length > 2, [idea]);
  const qualityScore = result?.readiness.score ?? null;
  const isWeakResult = qualityScore !== null && qualityScore < 75;

  const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim();
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/optimize` : "/api/optimize";

  // ── Analytics ──────────────────────────────────────────────────────────────

  const trackEvent = async (eventType: string, meta: Record<string, string> = {}) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, "users", user.uid, "songUsageEvents"), {
        eventType, meta, createdAt: Date.now(),
      });
    } catch { /* analytics must never block user flow */ }
  };

  // ── URL param restore (runs once on mount only) ────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingIdea = params.get("idea");
    if (incomingIdea) {
      setIdea(incomingIdea);
      flash("Template loaded from Starter Pack.");
    }
    const fromDraft = params.get("fromDraft");
    if (!fromDraft) return;
    const d = (key: string) => params.get(key);
    if (d("draftIdea")) setIdea(d("draftIdea")!);
    if (d("draftGenre")) setGenre(d("draftGenre")!);
    if (d("draftMood")) setMood(d("draftMood")!);
    if (d("draftVoice")) setVoice(d("draftVoice")!);
    if (d("draftEnergy")) setEnergy(d("draftEnergy")!);
    if (d("draftBpm")) setBpm(d("draftBpm")!);
    const dl = d("draftLength");
    if (dl === "standard" || dl === "extended") setLength(dl);
    flash("Song draft loaded from profile.");
  }, []); // ← FIXED: empty deps — only runs once on mount

  // ── Helpers ────────────────────────────────────────────────────────────────

  function flash(msg: string, ms = 2000) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), ms);
  }

  const copy = async (value: string, label = "Copied.", eventType = "copy") => {
    try {
      await navigator.clipboard.writeText(value);
      flash(label, 1600);
      await trackEvent(eventType, { mode: "song-machine-v3" });
    } catch {
      flash("Copy failed.", 1600);
    }
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  const generate = async (nextVariant = variant) => {
    if (!canGenerate) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fallback = buildSong({
      idea, genre, mood, voice, energy, bpm, length,
      perspective, hookStyle, themeKeywords, variant: nextVariant,
    });

    setIsGenerating(true);
    setEngineInfo("");

    const songBrief = [
      `Idea / concept: ${sanitize(idea) || "a comeback story"}`,
      `Genre: ${sanitize(genre) || "cinematic pop"}`,
      `Mood: ${sanitize(mood) || "reflective"}`,
      `Energy: ${sanitize(energy) || "medium"}`,
      `BPM: ${sanitize(bpm) || "118"}`,
      `Vocal style: ${sanitize(voice) || "raw lead vocal"}`,
      `Perspective: ${perspective}`,
      `Hook style: ${hookStyle === "anthemic" ? "big anthemic chorus" : "short punchy hook"}`,
      `Length: ${length === "extended" ? "extended (add Verse 3)" : "standard"}`,
      sanitize(themeKeywords) ? `Key theme words to weave in: ${sanitize(themeKeywords)}` : "",
      `Variant seed: ${nextVariant} (generate fresh phrasing, not a repeat of previous outputs)`,
    ].filter(Boolean).join("\n");

    // 22-second timeout for multi-attempt quality search
    const timeout = window.setTimeout(() => controller.abort(), 22000);

    let bestSong = fallback;
    let bestEngine = "Local engine";
    let bestScore = candidateQualityScore(fallback, idea);
    let gotAiResponse = false;
    let timedOut = false;

    const contexts = [
      "Create original radio-quality Suno-ready lyrics. Singable phrasing. No clichés. No repeated filler.",
      "Do NOT reuse key nouns from the user idea verbatim. Convert the concept into scenes and emotions. Avoid lexical overlap.",
      "Rewrite with stronger narrative logic: clear Verse 1 setup, Verse 2 progression, Bridge contrast. Absolutely no copy/paraphrase of the prompt sentence.",
      "Add concrete imagery and story progression. Replace abstract generic lines with scene detail. Keep hook compact and sticky.",
      "Final polish pass: remove awkward phrasing, ban repeated filler, ensure coherent emotional arc from Verse 1 to Outro.",
    ];

    try {
      for (let attempt = 0; attempt < contexts.length; attempt += 1) {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemPrompt: SONG_SYSTEM_PROMPT,
            prompt: `${songBrief}\nAttempt: ${attempt + 1}`,
            context: contexts[attempt],
            userEmail: user?.email || "",
          }),
        });

        if (!response.ok) continue;
        gotAiResponse = true;

        const data = await response.json();
        const ai = extractJsonObject(String(data?.output || ""));
        const merged = mergeAiWithFallback(ai, fallback, {
          genre: sanitize(genre), mood: sanitize(mood),
          voice: sanitize(voice), bpm: sanitize(bpm),
        });

        const provider = sanitize(String(data?.provider || ""));
        const model = sanitize(String(data?.model || ""));
        const engine = [provider, model].filter(Boolean).join(" / ") || (ai ? "AI" : "Local engine");
        const score = candidateQualityScore(merged, idea);
        if (score > bestScore) {
          bestScore = score;
          bestSong = merged;
          bestEngine = engine;
        }

        if (!isWeakSongCandidate(merged, idea)) break;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") timedOut = true;
    } finally {
      if (isWeakSongCandidate(bestSong, idea)) {
        const localRetryOffsets = [101, 211, 307];
        for (const offset of localRetryOffsets) {
          const localCandidate = buildSong({
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
            variant: nextVariant + offset,
          });
          const localScore = candidateQualityScore(localCandidate, idea);
          if (localScore > bestScore) {
            bestScore = localScore;
            bestSong = localCandidate;
            bestEngine = "Local engine (rewritten)";
          }
          if (!isWeakSongCandidate(bestSong, idea)) break;
        }
      }

      window.clearTimeout(timeout);
      setResult(bestSong);
      setEngineInfo(bestEngine);
      if (!gotAiResponse) {
        flash(timedOut ? "AI timed out — using local engine." : "AI unavailable — using local engine.", 2200);
      } else if (isWeakSongCandidate(bestSong, idea)) {
        flash("Still not strong enough. Click New Variation for another full rewrite pass.", 2400);
      } else {
        flash("✓ AI generation complete.", 2200);
      }
      setIsGenerating(false);
    }

    await trackEvent("generate_song", {
      mood: sanitize(mood), energy: sanitize(energy),
      length, perspective, hookStyle,
    });
  };

  const regenerate = async () => {
    const next = variant + 1;
    setVariant(next);
    await generate(next);
    await trackEvent("regenerate", { variation: String(next) });
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
    flash(`${preset.emoji} ${preset.label} preset loaded.`, 1500);
    await trackEvent("apply_preset", { preset: preset.id });
  };

  const saveDraft = async () => {
    if (!user?.uid || !result) {
      flash("Sign in and generate a song first.", 1600);
      return;
    }
    setSavingDraft(true);
    try {
      const title = result.titles[0] || "Untitled Draft";
      await addDoc(collection(db, "users", user.uid, "songDrafts"), {
        title,
        idea: sanitize(idea), genre: sanitize(genre), mood: sanitize(mood),
        voice: sanitize(voice), energy: sanitize(energy), bpm: sanitize(bpm),
        length, perspective, hookStyle, themeKeywords: sanitize(themeKeywords),
        verse1: result.verse1, chorus: result.chorus,
        fullLyrics: result.fullLyrics, stylePrompt: result.stylePrompt,
        sunoPasteBlock: result.sunoPasteBlock,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      flash("✓ Draft saved to profile.", 1600);
      await trackEvent("save_draft", { title });
    } catch {
      flash("Could not save draft.", 1600);
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputClass =
    "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-yellow-400/60 focus:ring-0 rounded-lg";

  const selectClass =
    "w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-400/60";

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(0,0,0,0.96)_45%,rgba(0,0,0,1)_80%)]" />

      <div className="relative z-10 px-4 py-10 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/70">Dunamis Architect</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Song Machine</h1>
          <p className="text-sm text-white/50">Describe your idea. Get Suno-ready lyrics.</p>
        </div>

        {/* Flash message */}
        {message && (
          <div className="rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 text-sm px-4 py-2 text-center">
            {message}
          </div>
        )}

        {/* Presets */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Quick Presets</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-white/10 bg-white/5 hover:bg-yellow-400/10 hover:border-yellow-400/30 text-white/70 hover:text-yellow-200 text-xs py-2 px-1 text-center transition-all"
              >
                <div className="text-lg mb-0.5">{p.emoji}</div>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main form */}
        <div className="rounded-2xl border border-white/10 bg-black/60 p-6 space-y-5">

          {/* Idea */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider">Song Idea *</label>
            <Textarea
              className={`${inputClass} min-h-[80px] resize-none`}
              placeholder="e.g. a soldier coming home to find everything has changed"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>

          {/* Genre + Mood */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Genre</label>
              <Input className={inputClass} placeholder="e.g. cinematic pop" value={genre} onChange={(e) => setGenre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Mood</label>
              <select className={selectClass} value={mood} onChange={(e) => setMood(e.target.value)}>
                <option value="uplifting">Uplifting</option>
                <option value="dark">Dark</option>
                <option value="reflective">Reflective</option>
                <option value="romantic">Romantic</option>
                <option value="energetic">Energetic</option>
                <option value="chill">Chill</option>
              </select>
            </div>
          </div>

          {/* Voice + BPM */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Vocal Style</label>
              <Input className={inputClass} placeholder="e.g. smooth falsetto" value={voice} onChange={(e) => setVoice(e.target.value)} />
              {!sanitize(voice) && (
                <p className="text-[10px] text-yellow-400/50">Leaving blank uses "raw lead vocal"</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">BPM</label>
              <Input className={inputClass} placeholder="118" value={bpm} onChange={(e) => setBpm(e.target.value)} />
            </div>
          </div>

          {/* Energy + Length + Perspective + Hook */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Energy</label>
              <select className={selectClass} value={energy} onChange={(e) => setEnergy(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Length</label>
              <select className={selectClass} value={length} onChange={(e) => setLength(e.target.value as any)}>
                <option value="standard">Standard</option>
                <option value="extended">Extended (+Verse 3)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Perspective</label>
              <select className={selectClass} value={perspective} onChange={(e) => setPerspective(e.target.value as any)}>
                <option value="first-person">First Person (I / We)</option>
                <option value="third-person">Third Person (He / She / They)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider">Hook Style</label>
              <select className={selectClass} value={hookStyle} onChange={(e) => setHookStyle(e.target.value as any)}>
                <option value="short">Short & Punchy</option>
                <option value="anthemic">Big Anthemic</option>
              </select>
            </div>
          </div>

          {/* Theme keywords */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 uppercase tracking-wider">Theme Keywords <span className="normal-case text-white/30">(optional)</span></label>
            <Input className={inputClass} placeholder="e.g. loyalty, sacrifice, brotherhood" value={themeKeywords} onChange={(e) => setThemeKeywords(e.target.value)} />
          </div>

          {/* Generate button */}
          <Button
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-base rounded-xl py-6 disabled:opacity-40 transition-all"
            disabled={!canGenerate || isGenerating}
            onClick={() => generate()}
          >
            {isGenerating ? "Generating…" : "Generate Song"}
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-yellow-500/20 bg-black/70 p-6 space-y-5">

            {/* Titles */}
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Suggested Titles</p>
              <div className="flex flex-wrap gap-2">
                {result.titles.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => copy(t, `"${t}" copied.`)}
                    className="text-sm text-yellow-200 border border-yellow-500/30 bg-yellow-400/5 hover:bg-yellow-400/15 rounded-lg px-3 py-1.5 transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Engine + readiness */}
            <div className="flex items-center justify-between text-xs text-white/40">
              {engineInfo && <span>Engine: {engineInfo}</span>}
              <span className={`ml-auto font-medium ${result.readiness.score >= 85 ? "text-green-400" : result.readiness.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                Readiness: {result.readiness.score}%
              </span>
            </div>

            {/* Readiness checks (only show if weak) */}
            {isWeakResult && (
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
                <p className="text-xs text-yellow-300/70 mb-2">Fix these to improve your Suno result:</p>
                {result.readiness.checks.filter((c) => !c.pass).map((c) => (
                  <div key={c.label} className="text-xs text-red-400">✗ {c.label}</div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
              {(["lyrics", "suno"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs uppercase tracking-wider px-4 py-2 rounded-lg border transition-all ${
                    activeTab === tab
                      ? "bg-yellow-400/15 border-yellow-400/40 text-yellow-200"
                      : "border-white/10 text-white/40 hover:text-white/70"
                  }`}
                >
                  {tab === "lyrics" ? "Full Lyrics" : "Suno Paste Block"}
                </button>
              ))}
            </div>

            {activeTab === "lyrics" && (
              <div className="space-y-3">
                <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-mono bg-white/5 rounded-xl p-4 max-h-96 overflow-y-auto">
                  {result.fullLyrics}
                </pre>
                <Button
                  variant="outline"
                  className="w-full border-yellow-500/30 text-yellow-200 hover:bg-yellow-400/10"
                  onClick={() => copy(result.fullLyrics, "Lyrics copied.", "copy_lyrics")}
                >
                  Copy Lyrics
                </Button>
              </div>
            )}

            {activeTab === "suno" && (
              <div className="space-y-3">
                <pre className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-mono bg-white/5 rounded-xl p-4 max-h-96 overflow-y-auto">
                  {result.sunoPasteBlock}
                </pre>
                <Button
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
                  onClick={() => copy(result.sunoPasteBlock, "✓ Suno block copied — paste into Suno now.", "copy_suno")}
                >
                  Copy & Paste into Suno
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:border-white/30"
                disabled={isGenerating}
                onClick={regenerate}
              >
                {isGenerating ? "Generating…" : "↻ New Variation"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:border-white/30"
                disabled={savingDraft || !user?.uid}
                onClick={saveDraft}
              >
                {savingDraft ? "Saving…" : "Save Draft"}
              </Button>
            </div>
            {!user?.uid && (
              <p className="text-xs text-white/30 text-center">Sign in to save drafts</p>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="text-center pt-2">
          <Link href="/">
            <Button variant="ghost" className="text-white/30 hover:text-white/60 text-sm">
              ← Back to Homepage
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
