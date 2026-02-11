import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";

type PromptPack = {
  id: string;
  title: string;
  template: string;
  updatedAt: number;
};

type AddToPackDialogProps = {
  promptText: string;
  suggestedTitle?: string;
  trigger?: React.ReactNode;
  onDone?: (message: string) => void;
};

export default function AddToPackDialog({
  promptText,
  suggestedTitle,
  trigger,
  onDone,
}: AddToPackDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string>("__new__");
  const [newPackTitle, setNewPackTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmedPrompt = useMemo(() => promptText.trim(), [promptText]);
  const promptTitle = useMemo(() => {
    const raw = (suggestedTitle || "Saved Prompt").trim();
    return raw || "Saved Prompt";
  }, [suggestedTitle]);
  const promptBlock = useMemo(() => {
    if (!trimmedPrompt) return "";
    return `### ${promptTitle}\n${trimmedPrompt}`;
  }, [promptTitle, trimmedPrompt]);
  const canSave = useMemo(() => {
    if (!promptBlock || !user) return false;
    if (selectedPackId === "__new__") return Boolean(newPackTitle.trim());
    return Boolean(selectedPackId);
  }, [promptBlock, user, selectedPackId, newPackTitle]);

  useEffect(() => {
    if (!open || !user) {
      setPacks([]);
      return;
    }

    setLoadingPacks(true);
    const packsQuery = query(
      collection(db, "users", user.uid, "promptPacks"),
      orderBy("updatedAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      packsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((packDoc) => {
          const data = packDoc.data() as Omit<PromptPack, "id">;
          return {
            id: packDoc.id,
            title: data.title || "Untitled Pack",
            template: data.template || "",
            updatedAt: Number(data.updatedAt || Date.now()),
          };
        });
        setPacks(next);
        setLoadingPacks(false);
      },
      () => {
        setLoadingPacks(false);
      },
    );

    return () => unsubscribe();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    setSelectedPackId("__new__");
    setNewPackTitle(suggestedTitle ? `${suggestedTitle} Pack` : "");
  }, [open, suggestedTitle]);

  const appendToPack = async () => {
    if (!user || !promptBlock) return;

    setSaving(true);
    try {
      if (selectedPackId === "__new__") {
        const now = Date.now();
        await addDoc(collection(db, "users", user.uid, "promptPacks"), {
          title: newPackTitle.trim(),
          template: promptBlock,
          createdAt: now,
          updatedAt: now,
        });
        onDone?.(`Added to new pack: ${newPackTitle.trim()}`);
      } else {
        const target = packs.find((pack) => pack.id === selectedPackId);
        if (!target) {
          onDone?.("Could not find selected pack.");
          setSaving(false);
          return;
        }
        const base = (target.template || "").trim();
        const nextTemplate = base ? `${base}\n\n---\n\n${promptBlock}` : promptBlock;
        await updateDoc(doc(db, "users", user.uid, "promptPacks", target.id), {
          template: nextTemplate,
          updatedAt: Date.now(),
        });
        onDone?.(`Added to pack: ${target.title}`);
      }

      setOpen(false);
    } catch {
      onDone?.("Could not add to pack.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
            Add to Pack
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-black/95 border-yellow-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-yellow-200">Add To Prompt Pack</DialogTitle>
          <DialogDescription className="text-gray-300">
            Save this prompt into an existing pack or create a new one.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="rounded-md border border-yellow-500/20 bg-black/50 px-3 py-2 text-sm text-gray-300">
            Sign in first to save prompts to packs.
          </div>
        ) : (
          <div className="space-y-3">
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Select Pack</span>
              <select
                value={selectedPackId}
                onChange={(event) => setSelectedPackId(event.target.value)}
                className="w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="__new__">Create new pack</option>
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.title}
                  </option>
                ))}
              </select>
            </label>

            {selectedPackId === "__new__" && (
              <label className="space-y-1 block">
                <span className="text-xs uppercase tracking-[0.2em] text-gray-400">New Pack Title</span>
                <Input
                  value={newPackTitle}
                  onChange={(event) => setNewPackTitle(event.target.value)}
                  maxLength={80}
                  placeholder="Pack title"
                  className="bg-black/40 border-yellow-500/30 text-white"
                />
              </label>
            )}

            {loadingPacks && (
              <p className="text-xs text-gray-400">Loading existing packs...</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            className="bg-yellow-400 text-black hover:bg-yellow-300"
            onClick={appendToPack}
            disabled={!canSave || saving}
          >
            {saving ? "Saving..." : "Add To Pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
