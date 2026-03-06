type Props = {
  mode: "guided" | "paste";
  onChange: (m: "guided" | "paste") => void;
};

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl border bg-white p-1">
      <button
        className={`px-3 py-2 rounded-lg text-sm ${mode === "guided" ? "bg-black text-white" : ""}`}
        onClick={() => onChange("guided")}
      >
        Guided Mode
      </button>
      <button
        className={`px-3 py-2 rounded-lg text-sm ${mode === "paste" ? "bg-black text-white" : ""}`}
        onClick={() => onChange("paste")}
      >
        Paste Mode
      </button>
    </div>
  );
}
