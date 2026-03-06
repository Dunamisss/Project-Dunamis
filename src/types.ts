export type UserAccessTier = "free" | "premium" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  authProvider: "google" | "email" | "github";
  accessTier: UserAccessTier;
  trialPromptUsed: boolean;
  strikes: number;
  banned: boolean;
  createdAt: number;
  lastLoginAt: number;
};
