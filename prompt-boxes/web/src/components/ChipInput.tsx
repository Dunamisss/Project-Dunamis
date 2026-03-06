import { useState } from "react";

type Props = {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
};

export default function ChipInput({ label, value, onChange, placeholder }: Props) {
  const [text, setText] = useState("");

  function addChip(raw: string) {
    const t = raw.trim();
    if (!t) return;
    const next = Array.from(new Set([...value, t])).slice(0, 30);
    onChange(next);
    setText("");
  }

  return (
    <div className="space-y-2">
      {label ? <div className="text-sm font-medium">{label}</div> : null}

      <div className="flex flex-wrap gap-2">
        {value.map((c) => (
          <span key={c} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
            {c}
            <button
              className="text-xs opacity-70 hover:opacity-100"
              onClick={() => onChange(value.filter((x) => x !== c))}
              aria-label="remove"
              type="button"
            >
              x
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? "Type and press Enter"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip(text);
            }
          }}
        />
        <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => addChip(text)} type="button">
          Add
        </button>
      </div>
    </div>
  );
}
