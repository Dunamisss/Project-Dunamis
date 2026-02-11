import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const USERS_COLLECTION = "users";

type ProfileInput = {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  authProvider: UserProfile["authProvider"];
};

export async function getUserProfile(uid: string) {
  if (!uid) return null;
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserProfile;
}

export async function createUserProfile(input?: ProfileInput) {
  if (!input?.uid) return null;

  const now = Date.now();
  const baseProfile: UserProfile = {
    uid: input.uid,
    email: input.email || "",
    displayName: input.displayName || "Dunamis Member",
    photoURL: input.photoURL || "",
    authProvider: input.authProvider,
    accessTier: "free",
    trialPromptUsed: false,
    strikes: 0,
    banned: false,
    createdAt: now,
    lastLoginAt: now,
  };

  const docRef = doc(db, USERS_COLLECTION, input.uid);
  const existing = await getDoc(docRef);
  if (!existing.exists()) {
    await setDoc(docRef, baseProfile, { merge: true });
    return baseProfile;
  }

  await setDoc(
    docRef,
    {
      email: input.email || "",
      displayName: input.displayName || existing.data().displayName || "Dunamis Member",
      photoURL: input.photoURL || existing.data().photoURL || "",
      authProvider: input.authProvider || existing.data().authProvider || "email",
      lastLoginAt: now,
    },
    { merge: true },
  );

  const merged = await getDoc(docRef);
  return merged.exists() ? (merged.data() as UserProfile) : null;
}

export async function updateLastLogin(uid?: string) {
  if (!uid) return;
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      lastLoginAt: Date.now(),
    },
    { merge: true },
  );
}

export async function checkPromptAccess() {
  return null;
}

export async function grantPromptAccess() {
  return;
}

export function getRandomTrialPrompt() {
  return null;
}

export async function claimTrialPrompt() {
  return false;
}

export async function addStrike() {
  return 0;
}

export async function warnUser() {
  return;
}

export async function banUser() {
  return;
}

export async function unbanUser() {
  return;
}

export async function logAudit() {
  return;
}

export async function createCustomPromptRequest() {
  return "";
}

export async function getCustomPromptRequests() {
  return [];
}

export async function completeCustomPromptRequest() {
  return;
}

export async function submitPrompt() {
  return "";
}

export async function getPendingSubmissions() {
  return [];
}

export async function approveSubmission() {
  return;
}

export async function rejectSubmission() {
  return;
}

export async function getApprovedPrompts() {
  return { prompts: [], hasMore: false, lastDoc: null };
}

export async function getUserSubmissions() {
  return [];
}

export async function getAuditLogs() {
  return [];
}

export async function togglePromptLock() {
  return;
}
