import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { auth, db, storage } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";

type UserProfile = {
  uid?: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  photoURL?: string;
  accessTier?: "free" | "premium" | "admin";
  strikes?: number;
  banned?: boolean;
  createdAt: number;
  updatedAt: number;
};

type AccountStatus = {
  limit: number;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  banned: boolean;
};

type PromptPack = {
  id: string;
  title: string;
  template: string;
  createdAt: number;
  updatedAt: number;
};

const setMeta = (name: string, content: string) => {
  const selector = name === "canonical"
    ? "link[rel=\"canonical\"]"
    : name.startsWith("og:")
      ? `meta[property="${name}"]`
      : `meta[name="${name}"]`;
  let tag = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!tag) {
    if (name === "canonical") {
      tag = document.createElement("link");
      tag.setAttribute("rel", "canonical");
    } else {
      tag = document.createElement("meta");
      if (name.startsWith("og:")) {
        tag.setAttribute("property", name);
      } else {
        tag.setAttribute("name", name);
      }
    }
    document.head.appendChild(tag);
  }
  if (name === "canonical") {
    tag.setAttribute("href", content);
  } else {
    tag.setAttribute("content", content);
  }
};

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { loadPrompt } = useChat();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [awaitingUnlock, setAwaitingUnlock] = useState(false);
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [creatingPack, setCreatingPack] = useState(false);
  const [updatingPackId, setUpdatingPackId] = useState<string | null>(null);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [newPackTitle, setNewPackTitle] = useState("");
  const [newPackTemplate, setNewPackTemplate] = useState("");
  const [editPackTitle, setEditPackTitle] = useState("");
  const [editPackTemplate, setEditPackTemplate] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? "";
  const accountStatusUrl = apiBase
    ? `${apiBase.replace(/\/+$/, "")}/api/account-status`
    : "/api/account-status";

  const loadAccountStatus = useCallback(async () => {
    if (!user?.email) {
      setAccountStatus(null);
      return;
    }

    setLoadingStatus(true);
    try {
      const response = await fetch(accountStatusUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: user.email }),
      });
      if (!response.ok) {
        throw new Error("Status lookup failed.");
      }
      const data = await response.json();
      setAccountStatus({
        limit: Number(data?.limit || 3),
        used: Number(data?.used || 0),
        remaining: typeof data?.remaining === "number" ? data.remaining : null,
        unlimited: Boolean(data?.unlimited),
        banned: Boolean(data?.banned),
      });
    } catch {
      setAccountStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [user?.email, accountStatusUrl]);

  const initials = useMemo(() => {
    const name = profile?.displayName || user?.displayName || "";
    const email = profile?.email || user?.email || "";
    const base = name || email || "U";
    return base
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;

    const now = Date.now();
    const docRef = doc(db, "users", user.uid);
    const fallbackProfile: UserProfile = {
      displayName: user.displayName || "Dunamis Member",
      email: user.email || "",
      avatarUrl: user.photoURL || "",
      createdAt: now,
      updatedAt: now,
    };

    const ensureProfile = async () => {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, fallbackProfile, { merge: true });
      }
    };

    ensureProfile().catch(() => {});

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        setProfile(fallbackProfile);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
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
            createdAt: Number(data.createdAt || Date.now()),
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
  }, [user]);

  const currentDisplayName = (profile?.displayName || user?.displayName || "Dunamis Member").trim();
  const normalizedDisplayNameInput = displayNameInput.trim();
  const isNameDirty = normalizedDisplayNameInput !== currentDisplayName;

  useEffect(() => {
    if (!user) return;
    if (isEditingName) return;
    setDisplayNameInput(currentDisplayName);
  }, [user, currentDisplayName, isEditingName]);

  useEffect(() => {
    loadAccountStatus();
  }, [loadAccountStatus]);

  useEffect(() => {
    document.title = "Profile — DUNAMIS";
    setMeta("description", "Manage your Dunamis profile and avatar.");
    setMeta("canonical", `${window.location.origin}/profile`);
    setMeta("robots", "noindex,nofollow");
  }, []);

  const handleSaveDisplayName = async () => {
    if (!user) return;
    const nextName = normalizedDisplayNameInput;
    if (!nextName) {
      setMessage("Display name cannot be empty.");
      return;
    }
    if (nextName.length > 60) {
      setMessage("Display name must be 60 characters or less.");
      return;
    }

    setSavingName(true);
    setMessage(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: nextName,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      await updateProfile(user, { displayName: nextName });
      setIsEditingName(false);
      setMessage("Display name updated.");
    } catch {
      setMessage("Could not update display name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Avatar must be under 2MB.");
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `avatars/${user.uid}/avatar.${ext}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await setDoc(
        doc(db, "users", user.uid),
        {
          avatarUrl: url,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      setMessage("Avatar updated.");
    } catch {
      setMessage("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetPackInputs = () => {
    setNewPackTitle("");
    setNewPackTemplate("");
  };

  const handleCreatePack = async () => {
    if (!user) return;
    const title = newPackTitle.trim();
    const template = newPackTemplate.trim();
    if (!title) {
      setMessage("Pack title is required.");
      return;
    }
    if (!template) {
      setMessage("Pack template is required.");
      return;
    }

    setCreatingPack(true);
    setMessage(null);
    try {
      const now = Date.now();
      await addDoc(collection(db, "users", user.uid, "promptPacks"), {
        title,
        template,
        createdAt: now,
        updatedAt: now,
      });
      resetPackInputs();
      setMessage("Prompt pack created.");
    } catch {
      setMessage("Could not create prompt pack.");
    } finally {
      setCreatingPack(false);
    }
  };

  const beginEditPack = (pack: PromptPack) => {
    setEditingPackId(pack.id);
    setEditPackTitle(pack.title);
    setEditPackTemplate(pack.template);
  };

  const handleSavePack = async () => {
    if (!user || !editingPackId) return;
    const title = editPackTitle.trim();
    const template = editPackTemplate.trim();
    if (!title) {
      setMessage("Pack title is required.");
      return;
    }
    if (!template) {
      setMessage("Pack template is required.");
      return;
    }

    setUpdatingPackId(editingPackId);
    setMessage(null);
    try {
      await updateDoc(doc(db, "users", user.uid, "promptPacks", editingPackId), {
        title,
        template,
        updatedAt: Date.now(),
      });
      setEditingPackId(null);
      setEditPackTitle("");
      setEditPackTemplate("");
      setMessage("Prompt pack updated.");
    } catch {
      setMessage("Could not update prompt pack.");
    } finally {
      setUpdatingPackId(null);
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!user) return;
    setDeletingPackId(packId);
    setMessage(null);
    try {
      await deleteDoc(doc(db, "users", user.uid, "promptPacks", packId));
      if (editingPackId === packId) {
        setEditingPackId(null);
      }
      setMessage("Prompt pack deleted.");
    } catch {
      setMessage("Could not delete prompt pack.");
    } finally {
      setDeletingPackId(null);
    }
  };

  const handleUsePack = (template: string) => {
    if (!template.trim()) return;
    loadPrompt(template);
    setLocation("/");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setMessage("No email on file.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("Password reset email sent.");
    } catch {
      setMessage("Could not send reset email.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-16 max-w-3xl mx-auto text-gray-300">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-16 max-w-3xl mx-auto space-y-6 text-center">
          <h1 className="text-3xl font-semibold text-yellow-200">Profile</h1>
          <p className="text-sm text-gray-300">Please sign in to access your profile.</p>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.avatarUrl || user.photoURL || "";
  const hasPasswordProvider = user.providerData.some((p) => p.providerId === "password");
  const joinedDateRaw = profile?.createdAt || (user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : null);
  const joinedDate = joinedDateRaw ? new Date(joinedDateRaw).toLocaleDateString() : "Unknown";
  const isUnlimited = Boolean(accountStatus?.unlimited || profile?.accessTier === "premium" || profile?.accessTier === "admin");
  const isBanned = Boolean(accountStatus?.banned || profile?.banned);
  const strikes = Number(profile?.strikes || 0);
  const accountState = isBanned ? "Banned" : strikes > 0 ? "Warned" : "Active";
  const usageValue = isUnlimited
    ? "Unlimited"
    : accountStatus?.remaining !== null && accountStatus?.remaining !== undefined
      ? `${accountStatus.remaining} of ${accountStatus.limit}`
      : loadingStatus
        ? "Loading..."
        : "Not available";

  useEffect(() => {
    if (isUnlimited && awaitingUnlock) {
      setAwaitingUnlock(false);
      setMessage("Unlimited access detected. Your account is now unlocked.");
    }
  }, [isUnlimited, awaitingUnlock]);

  useEffect(() => {
    if (!awaitingUnlock || isUnlimited) return;
    const intervalId = window.setInterval(() => {
      loadAccountStatus();
    }, 10000);
    const timeoutId = window.setTimeout(() => {
      setAwaitingUnlock(false);
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [awaitingUnlock, isUnlimited, loadAccountStatus]);

  useEffect(() => {
    if (!awaitingUnlock || isUnlimited) return;
    const onFocus = () => {
      loadAccountStatus();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [awaitingUnlock, isUnlimited, loadAccountStatus]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-12 max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Your Profile</h1>
            <p className="text-sm text-gray-300">Update your avatar and review your account details.</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Home
            </Button>
          </Link>
        </div>

        <section className="rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="h-24 w-24 rounded-full border border-yellow-500/30 bg-black/50 flex items-center justify-center overflow-hidden text-yellow-200 text-xl font-semibold">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-yellow-200">{profile?.displayName || user.displayName}</p>
              <p className="text-sm text-gray-300">{profile?.email || user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-[0.25em]">Display Name</p>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={displayNameInput}
                onChange={(event) => {
                  setDisplayNameInput(event.target.value);
                  setIsEditingName(true);
                }}
                maxLength={60}
                className="bg-black/40 border-yellow-500/30 text-white"
                placeholder="Your display name"
              />
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={handleSaveDisplayName}
                disabled={savingName || !isNameDirty || !normalizedDisplayNameInput}
              >
                {savingName ? "Saving..." : "Save Name"}
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">Shown across your profile and submissions.</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-[0.25em]">My Prompt Packs</p>
            <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 space-y-3">
              <Input
                value={newPackTitle}
                onChange={(event) => setNewPackTitle(event.target.value)}
                maxLength={80}
                className="bg-black/40 border-yellow-500/30 text-white"
                placeholder="Pack title (e.g. YouTube Hooks)"
              />
              <Textarea
                value={newPackTemplate}
                onChange={(event) => setNewPackTemplate(event.target.value)}
                className="min-h-[140px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-400"
                placeholder="Template prompt with placeholders, e.g. Write a [PLATFORM] post about [TOPIC] for [AUDIENCE] in a [TONE] tone."
              />
              <div className="flex gap-2">
                <Button
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={handleCreatePack}
                  disabled={creatingPack || !newPackTitle.trim() || !newPackTemplate.trim()}
                >
                  {creatingPack ? "Creating..." : "Create Pack"}
                </Button>
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={resetPackInputs}
                  disabled={creatingPack}
                >
                  Clear
                </Button>
              </div>
            </div>

            {loadingPacks ? (
              <p className="text-sm text-gray-300">Loading packs...</p>
            ) : packs.length === 0 ? (
              <p className="text-sm text-gray-300">No packs yet. Create your first reusable prompt pack above.</p>
            ) : (
              <div className="space-y-3">
                {packs.map((pack) => {
                  const isEditingThis = editingPackId === pack.id;
                  const isUpdatingThis = updatingPackId === pack.id;
                  const isDeletingThis = deletingPackId === pack.id;
                  const updatedDate = new Date(pack.updatedAt).toLocaleDateString();

                  return (
                    <div key={pack.id} className="rounded-md border border-yellow-500/20 bg-black/40 p-3 space-y-3">
                      {isEditingThis ? (
                        <>
                          <Input
                            value={editPackTitle}
                            onChange={(event) => setEditPackTitle(event.target.value)}
                            maxLength={80}
                            className="bg-black/40 border-yellow-500/30 text-white"
                          />
                          <Textarea
                            value={editPackTemplate}
                            onChange={(event) => setEditPackTemplate(event.target.value)}
                            className="min-h-[140px] bg-black/40 border-yellow-500/30 text-white"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="bg-yellow-400 text-black hover:bg-yellow-300"
                              onClick={handleSavePack}
                              disabled={isUpdatingThis || !editPackTitle.trim() || !editPackTemplate.trim()}
                            >
                              {isUpdatingThis ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              variant="outline"
                              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                              onClick={() => setEditingPackId(null)}
                              disabled={isUpdatingThis}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <p className="text-yellow-200 font-semibold">{pack.title}</p>
                            <p className="text-[11px] text-gray-400">Updated {updatedDate}</p>
                          </div>
                          <Textarea
                            value={pack.template}
                            readOnly
                            className="min-h-[120px] bg-black/30 border-yellow-500/20 text-white"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="bg-yellow-400 text-black hover:bg-yellow-300"
                              onClick={() => handleUsePack(pack.template)}
                            >
                              Use in Optimizer
                            </Button>
                            <Button
                              variant="outline"
                              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                              onClick={() => beginEditPack(pack)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                              onClick={() => handleDeletePack(pack.id)}
                              disabled={isDeletingThis}
                            >
                              {isDeletingThis ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-[0.25em]">Usage & Access</p>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={loadAccountStatus}
                disabled={loadingStatus}
              >
                {loadingStatus ? "Refreshing..." : "Refresh Status"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em]">Plan</p>
                <p className="text-yellow-200 font-semibold">{isUnlimited ? "Unlimited" : "Free"}</p>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em]">Uses Left</p>
                <p className="text-yellow-200 font-semibold">{usageValue}</p>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em]">Account State</p>
                <p className="text-yellow-200 font-semibold">{accountState}</p>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em]">Joined</p>
                <p className="text-yellow-200 font-semibold">{joinedDate}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-md border border-yellow-500/20 bg-black/40 px-3 py-3">
              <p className="text-[12px] text-gray-300">
                {isUnlimited
                  ? "Your account is unlocked for unlimited optimizer usage."
                  : "Support the project on Ko-fi and we can unlock unlimited optimizer usage."}
              </p>
              <a href="https://ko-fi.com/dunamis_site" target="_blank" rel="noopener noreferrer">
                <Button
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={() => {
                    setAwaitingUnlock(true);
                    setMessage("We’ll auto-check your unlock status for the next few minutes.");
                    loadAccountStatus();
                  }}
                >
                  {isUnlimited ? "Support Anyway" : "Support Unlock"}
                </Button>
              </a>
            </div>
            {awaitingUnlock && !isUnlimited && (
              <p className="text-[11px] text-gray-400">
                Waiting for webhook confirmation. Status refresh runs automatically every 10 seconds.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-[0.25em]">Avatar</p>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => handleAvatarUpload(event.target.files?.[0] ?? null)}
              className="bg-black/40 border-yellow-500/30 text-white"
            />
            <p className="text-[11px] text-gray-400">PNG or JPG, under 2MB.</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-[0.25em]">Password</p>
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={handlePasswordReset}
              disabled={!hasPasswordProvider}
            >
              Send password reset email
            </Button>
            {!hasPasswordProvider && (
              <p className="text-[11px] text-gray-400">
                You signed in with a social account. Password reset is not required.
              </p>
            )}
          </div>
        </section>

        {message && (
          <div className="rounded-full border border-yellow-500/40 bg-black/90 px-4 py-2 text-[12px] text-yellow-200 shadow-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
