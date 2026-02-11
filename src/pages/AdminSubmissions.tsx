import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";

type SubmissionRecord = {
  id: string;
  type: "prompt" | "image";
  status: "pending" | "approved" | "rejected";
  title: string;
  description: string;
  tags?: string[];
  category?: string;
  promptContent?: string;
  promptUsed?: string;
  imageUrl?: string;
  userDisplayName?: string;
  userEmail?: string;
  userId?: string;
  createdAt?: number;
  updatedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
};

type UserProfile = {
  accessTier?: "free" | "premium" | "admin";
};

export default function AdminSubmissions() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [items, setItems] = useState<SubmissionRecord[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoadingAdmin(false);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const profile = (snap.data() || {}) as UserProfile;
        setIsAdmin(profile.accessTier === "admin");
        setLoadingAdmin(false);
      },
      () => {
        setIsAdmin(false);
        setLoadingAdmin(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setItems([]);
      setLoadingItems(false);
      return;
    }
    setLoadingItems(true);
    const submissionsQuery = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<SubmissionRecord, "id">;
          return { id: docSnap.id, ...data };
        });
        setItems(next);
        setLoadingItems(false);
      },
      () => {
        setLoadingItems(false);
      },
    );
    return () => unsubscribe();
  }, [isAdmin]);

  const pendingItems = useMemo(
    () => items.filter((item) => item.status === "pending"),
    [items],
  );

  const updateStatus = async (item: SubmissionRecord, status: "approved" | "rejected") => {
    if (!user || !isAdmin) return;
    setWorkingId(item.id);
    setMessage(null);
    try {
      await updateDoc(doc(db, "submissions", item.id), {
        status,
        updatedAt: Date.now(),
        reviewedBy: user.uid,
        reviewNote: reviewNote.trim(),
        approvedAt: status === "approved" ? Date.now() : null,
        rejectedAt: status === "rejected" ? Date.now() : null,
      });
      setReviewNote("");
      setMessage(`Submission ${status}.`);
    } catch {
      setMessage("Action failed. Please try again.");
    } finally {
      setWorkingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-10 max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-semibold text-yellow-200">Admin Moderation</h1>
          <p className="text-sm text-gray-300">Please sign in first.</p>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loadingAdmin) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-10 max-w-5xl mx-auto">
          <p className="text-sm text-gray-300">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-10 max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-semibold text-yellow-200">Admin Moderation</h1>
          <p className="text-sm text-gray-300">You do not have admin access.</p>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Admin</p>
            <h1 className="text-3xl font-semibold text-yellow-200">Submission Moderation</h1>
            <p className="text-sm text-gray-300">Approve or reject community submissions.</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back Home
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-gray-300">Pending queue: {pendingItems.length}</p>
            <Input
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Optional moderation note"
              className="w-full md:w-[360px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
            />
          </div>
          {message && <p className="mt-3 text-sm text-yellow-200">{message}</p>}
        </div>

        {loadingItems ? (
          <p className="text-sm text-gray-300">Loading submissions...</p>
        ) : pendingItems.length === 0 ? (
          <p className="text-sm text-gray-300">No pending submissions.</p>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-yellow-500/20 bg-black/60 p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/80">{item.type}</p>
                    <h2 className="text-xl font-semibold text-yellow-100 break-words">{item.title}</h2>
                    <p className="text-xs text-gray-400">
                      Submitted by {item.userDisplayName || "Unknown"} ({item.userEmail || "No email"})
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                  </p>
                </div>
                <p className="text-sm text-gray-300 break-words">{item.description}</p>
                {item.tags?.length ? (
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                    {item.tags.map((tag) => (
                      <span key={`${item.id}-${tag}`} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.type === "prompt" ? (
                  <Textarea
                    value={item.promptContent || ""}
                    readOnly
                    className="min-h-[180px] bg-black/40 border-yellow-500/20 text-white"
                  />
                ) : (
                  <div className="space-y-2">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="max-h-[420px] w-full object-contain rounded-md border border-yellow-500/20 bg-black/40"
                      />
                    ) : null}
                    {item.promptUsed ? (
                      <Textarea
                        value={item.promptUsed}
                        readOnly
                        className="min-h-[120px] bg-black/40 border-yellow-500/20 text-white"
                      />
                    ) : null}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    className="bg-yellow-400 text-black hover:bg-yellow-300"
                    onClick={() => updateStatus(item, "approved")}
                    disabled={workingId === item.id}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                    onClick={() => updateStatus(item, "rejected")}
                    disabled={workingId === item.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

