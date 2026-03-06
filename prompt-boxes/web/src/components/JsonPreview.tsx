import type { PromptDoc } from "../types";

export default function JsonPreview({ doc }: { doc: PromptDoc }) {
  const text = JSON.stringify(doc, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">JSON</div>
        <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={copy} type="button">
          Copy
        </button>
      </div>
      <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-neutral-50 p-3 text-xs">{text}</pre>
    </div>
  );
}
