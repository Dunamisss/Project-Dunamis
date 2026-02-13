import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SongOutput = {
  titles: string[];
  verse1: string;
  chorus: string;
  fullLyrics: string;
  stylePrompt: string;
  sunoPasteBlock: string;
};

const MOOD_WORDS: Record<string, string[]> = {
  uplifting: ["rising", "golden", "hopeful", "wide-open", "steady"],
  dark: ["shadowed", "heavy", "neon-night", "cold", "restless"],
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

function sanitize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function line(seed: number, mood: string, theme: string) {
  const moodPool = MOOD_WORDS[mood] || MOOD_WORDS.reflective;
  const moodWord = pick(moodPool, seed + 3);
  const opener = pick(OPENERS, seed + 5);
  return `${opener}, ${moodWord} around the edges, still chasing ${theme}.`;
}

function makeVerse(seed: number, mood: string, theme: string, voice: string) {
  return [
    line(seed, mood, theme),
    `Every step is ${pick(["measured", "reckless", "careful", "hungry"], seed + 11)}, but the vision stays clear.`,
    `I hear ${voice} in the static, telling me not to disappear.`,
    `If this is the cost of becoming, then we pay and persevere.`,
  ].join("\n");
}

function makeChorus(seed: number, theme: string) {
  const hook = pick(HOOKS, seed + 7);
  return [
    `${hook},`,
    `hands up to the sky, we don't fold tonight,`,
    `all this weight turns light when we call it by name,`,
    `we came too far to leave without a flame for ${theme}.`,
  ].join("\n");
}

function buildSong(params: {
  idea: string;
  genre: string;
  mood: string;
  voice: string;
  energy: string;
  bpm: string;
  length: "standard" | "extended";
  variant: number;
}): SongOutput {
  const idea = sanitize(params.idea) || "a comeback story";
  const genre = sanitize(params.genre) || "cinematic pop";
  const mood = sanitize(params.mood).toLowerCase() || "reflective";
  const voice = sanitize(params.voice) || "raw lead vocal";
  const energy = sanitize(params.energy) || "medium";
  const bpm = sanitize(params.bpm) || "118";
  const seed = `${idea}|${genre}|${mood}|${voice}|${energy}|${params.variant}`
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  const verse1 = makeVerse(seed, mood, idea, voice);
  const chorus = makeChorus(seed, idea);
  const verse2 = makeVerse(seed + 13, mood, idea, voice);
  const bridge = [
    `Strip it back, let the room breathe.`,
    `One note, one truth, one reason we stayed.`,
    `Then hit the lift and bring the skyline with us.`,
  ].join("\n");
  const outro = [
    `Fade on harmonies, leave the final word hanging.`,
    `Repeat the hook softly, then end clean.`,
  ].join("\n");

  const fullLyrics = [
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
      ? "[Verse 3]\n" + makeVerse(seed + 29, mood, idea, voice) + "\n\n[Final Chorus]\n" + chorus
      : "",
    "",
    "[Outro]",
    outro,
  ]
    .filter(Boolean)
    .join("\n");

  const titles = [
    `${pick(["Neon", "Midnight", "Gold", "Static", "Afterlight"], seed)} ${pick(["Promise", "Signal", "Drive", "Echo", "Rise"], seed + 2)}`,
    `${pick(["Hold", "Carry", "Light", "Fire", "Storm"], seed + 4)} the ${pick(["Line", "Noise", "Night", "Weight", "Flame"], seed + 6)}`,
    `${pick(["No", "Last", "One", "Final", "Open"], seed + 8)} ${pick(["Surrender", "Call", "Chance", "Motion", "Signal"], seed + 10)}`,
  ];

  const stylePrompt = [
    `${genre}, ${mood} mood, ${energy} energy, ${bpm} BPM.`,
    `Lead voice style: ${voice}.`,
    "Modern radio-ready mix, clean hook, strong emotional build.",
    "Avoid generic filler lines and avoid artist-name imitation.",
  ].join(" ");

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

  return { titles, verse1, chorus, fullLyrics, stylePrompt, sunoPasteBlock };
}

export default function SunoSongMachine() {
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("uplifting");
  const [voice, setVoice] = useState("");
  const [energy, setEnergy] = useState("medium");
  const [bpm, setBpm] = useState("118");
  const [length, setLength] = useState<"standard" | "extended">("standard");
  const [variant, setVariant] = useState(0);
  const [result, setResult] = useState<SongOutput | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canGenerate = useMemo(() => sanitize(idea).length > 2, [idea]);

  const copy = async (value: string, ok = "Copied.") => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(ok);
      window.setTimeout(() => setMessage(null), 1600);
    } catch {
      setMessage("Copy failed.");
      window.setTimeout(() => setMessage(null), 1600);
    }
  };

  const generate = (nextVariant = variant) => {
    const output = buildSong({
      idea,
      genre,
      mood,
      voice,
      energy,
      bpm,
      length,
      variant: nextVariant,
    });
    setResult(output);
  };

  const regenerate = () => {
    const next = variant + 1;
    setVariant(next);
    generate(next);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),rgba(0,0,0,0.95)_45%,rgba(0,0,0,1)_80%)]" />
      <div className="relative z-10 px-4 py-10 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Beta</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Suno Song Machine</h1>
            <p className="text-sm text-gray-300 max-w-3xl">
              Tell us what song you want. Get Verse 1 + Chorus first, tweak it, then copy a full
              Suno-ready song pack.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://suno.com/" target="_blank" rel="noopener noreferrer">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300">
                Open Suno
              </Button>
            </a>
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/65 p-5 md:p-6 shadow-lg space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-200/80">How To Use</p>
          <p className="text-sm text-gray-300">1. Type what song you want.</p>
          <p className="text-sm text-gray-300">2. Click Generate Preview (Verse + Chorus).</p>
          <p className="text-sm text-gray-300">3. Regenerate variation until it feels right.</p>
          <p className="text-sm text-gray-300">4. Copy the Suno Paste Block into Suno.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Song Setup</p>
            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">What song do you want?</span>
              <Textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                className="min-h-[88px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                placeholder="Example: an uplifting comeback anthem about rebuilding after a hard year"
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Genre/style</span>
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
                <select
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                >
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
                <select
                  value={energy}
                  onChange={(event) => setEnergy(event.target.value)}
                  className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-xs text-gray-300">Voice style</span>
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
            <label className="space-y-2 block">
              <span className="text-xs text-gray-300">Song length</span>
              <select
                value={length}
                onChange={(event) => setLength(event.target.value as "standard" | "extended")}
                className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
              >
                <option value="standard">Standard (2 verses + bridge)</option>
                <option value="extended">Extended (adds verse 3)</option>
              </select>
            </label>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                className="bg-yellow-400 text-black hover:bg-yellow-300"
                onClick={() => generate()}
                disabled={!canGenerate}
              >
                Generate Preview
              </Button>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={regenerate}
                disabled={!result}
              >
                Regenerate Variation
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Output</p>
            {!result ? (
              <p className="text-sm text-gray-400">Generate a preview to see lyrics and Suno paste block.</p>
            ) : (
              <>
                <div className="space-y-2 rounded-md border border-yellow-500/20 bg-black/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Title options</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                      onClick={() => copy(result.titles.join("\n"), "Titles copied.")}
                    >
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                      onClick={() => copy(`[Verse 1]\n${result.verse1}\n\n[Chorus]\n${result.chorus}`, "Preview copied.")}
                    >
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={`[Verse 1]\n${result.verse1}\n\n[Chorus]\n${result.chorus}`}
                    readOnly
                    className="min-h-[220px] bg-black/40 border-yellow-500/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-200">Suno Paste Block</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                      onClick={() => copy(result.sunoPasteBlock, "Suno block copied.")}
                    >
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={result.sunoPasteBlock}
                    readOnly
                    className="min-h-[260px] bg-black/40 border-yellow-500/20 text-white"
                  />
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
