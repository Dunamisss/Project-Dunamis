import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";

type SubmissionType = "prompt" | "image";
type PromptCategory =
  | "Art"
  | "Marketing"
  | "Development"
  | "Business"
  | "Creative Writing"
  | "Productivity"
  | "SEO"
  | "Other";

const categories: PromptCategory[] = [
  "Art",
  "Marketing",
  "Development",
  "Business",
  "Creative Writing",
  "Productivity",
  "SEO",
  "Other",
];

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

export default function SubmitPrompt() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SubmissionType>("prompt");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [promptTitle, setPromptTitle] = useState("");
  const [promptDescription, setPromptDescription] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [promptCategory, setPromptCategory] = useState<PromptCategory>("Other");
  const [promptTags, setPromptTags] = useState("");

  const [imageTitle, setImageTitle] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [imageTags, setImageTags] = useState("");
  const [imagePromptUsed, setImagePromptUsed] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const resetPromptForm = () => {
    setPromptTitle("");
    setPromptDescription("");
    setPromptContent("");
    setPromptCategory("Other");
    setPromptTags("");
  };

  const resetImageForm = () => {
    setImageTitle("");
    setImageDescription("");
    setImageTags("");
    setImagePromptUsed("");
    setImageUrl("");
  };

  const submitPrompt = async () => {
    if (!user) return;
    if (!promptTitle.trim() || !promptDescription.trim() || !promptContent.trim()) {
      setMessage("Please fill in title, description, and prompt content.");
      return;
    }
    await addDoc(collection(db, "submissions"), {
      type: "prompt",
      status: "pending",
      title: promptTitle.trim(),
      description: promptDescription.trim(),
      category: promptCategory,
      tags: parseTags(promptTags),
      promptContent: promptContent.trim(),
      userId: user.uid,
      userEmail: user.email || "",
      userDisplayName: user.displayName || "Dunamis Member",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    resetPromptForm();
    setMessage("Prompt submitted. It is now pending admin review.");
  };

  const submitImage = async () => {
    if (!user) return;
    if (!imageTitle.trim() || !imageDescription.trim() || !imageUrl.trim()) {
      setMessage("Please fill in title, description, and image URL.");
      return;
    }
    if (!/^https?:\/\//i.test(imageUrl.trim())) {
      setMessage("Image URL must start with http:// or https://");
      return;
    }

    await addDoc(collection(db, "submissions"), {
      type: "image",
      status: "pending",
      title: imageTitle.trim(),
      description: imageDescription.trim(),
      tags: parseTags(imageTags),
      promptUsed: imagePromptUsed.trim(),
      imageUrl: imageUrl.trim(),
      thumbUrl: imageUrl.trim(),
      userId: user.uid,
      userEmail: user.email || "",
      userDisplayName: user.displayName || "Dunamis Member",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    resetImageForm();
    setMessage("Image submitted. It is now pending admin review.");
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      if (activeTab === "prompt") {
        await submitPrompt();
      } else {
        await submitImage();
      }
    } catch {
      setMessage("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Community Submissions</h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Submit your own prompts or images. Every submission is reviewed by admin before it appears in the library.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back Home
              </Button>
            </Link>
          </div>
        </div>

        {!user ? (
          <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-3">
            <p className="text-sm text-gray-300">Please sign in to submit content.</p>
            <AuthModal />
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-5">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SubmissionType)}>
              <TabsList className="grid grid-cols-2 bg-black/50 border border-yellow-500/20">
                <TabsTrigger value="prompt">Submit Prompt</TabsTrigger>
                <TabsTrigger value="image">Submit Image</TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="mt-4 space-y-3">
                <Input
                  value={promptTitle}
                  onChange={(event) => setPromptTitle(event.target.value)}
                  placeholder="Prompt title"
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Textarea
                  value={promptDescription}
                  onChange={(event) => setPromptDescription(event.target.value)}
                  placeholder="Short description (what this prompt does)"
                  className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Textarea
                  value={promptContent}
                  onChange={(event) => setPromptContent(event.target.value)}
                  placeholder="Paste the full prompt here..."
                  className="min-h-[200px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={promptCategory}
                    onChange={(event) => setPromptCategory(event.target.value as PromptCategory)}
                    className="h-10 rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={promptTags}
                    onChange={(event) => setPromptTags(event.target.value)}
                    placeholder="Tags (comma separated)"
                    className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-4 space-y-3">
                <Input
                  value={imageTitle}
                  onChange={(event) => setImageTitle(event.target.value)}
                  placeholder="Image title"
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Textarea
                  value={imageDescription}
                  onChange={(event) => setImageDescription(event.target.value)}
                  placeholder="Short description of the image"
                  className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Textarea
                  value={imagePromptUsed}
                  onChange={(event) => setImagePromptUsed(event.target.value)}
                  placeholder="Optional: prompt used to create this image"
                  className="min-h-[120px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Input
                  value={imageTags}
                  onChange={(event) => setImageTags(event.target.value)}
                  placeholder="Tags (comma separated)"
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
                <Input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="Image URL (https://...)"
                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                />
              </TabsContent>
            </Tabs>

            {message && <p className="text-sm text-yellow-200">{message}</p>}

            <div className="flex items-center gap-3">
              <Button
                className="bg-yellow-400 text-black hover:bg-yellow-300"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit for Review"}
              </Button>
              <p className="text-xs text-gray-400">
                Approved items appear automatically in the libraries.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
