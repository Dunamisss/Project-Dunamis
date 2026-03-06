export default function PromptPreview({ text }: { text: string }) {
  async function copy() {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Clean Prompt</div>
        <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={copy} type="button">
          Copy
        </button>
      </div>
      <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-xs">
        {text}
      </pre>
    </div>
  );
}
