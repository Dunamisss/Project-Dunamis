import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  userProfile: null;
  isLoading: boolean;
  isBanned: boolean;
  accessTier: "free";
  login: (provider: string, email?: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (provider: string, email?: string, password?: string) => {
    if (!auth) return;
    if (provider !== "google") {
      if (provider === "email") {
        if (!email || !password) {
          throw new Error("Email and password are required.");
        }
        await signInWithEmailAndPassword(auth, email, password);
        return;
      }
      if (provider === "signup") {
        if (!email || !password) {
          throw new Error("Email and password are required.");
        }
        await createUserWithEmailAndPassword(auth, email, password);
        return;
      }
      throw new Error("Unsupported provider.");
    }
    await signInWithPopup(auth, googleProvider);
  };

  const resetPassword = async (email: string) => {
    if (!auth) return;
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    userProfile: null,
    isLoading,
    isBanned: false,
    accessTier: "free",
    login,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
