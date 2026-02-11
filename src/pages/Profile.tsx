import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { sendPasswordResetEmail } from "firebase/auth";

type UserProfile = {
  displayName: string;
  email: string;
  avatarUrl: string;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    document.title = "Profile — DUNAMIS";
    setMeta("description", "Manage your Dunamis profile and avatar.");
    setMeta("canonical", `${window.location.origin}/profile`);
    setMeta("robots", "noindex,nofollow");
  }, []);

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
                You signed in with Google. Password reset is not required.
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
