import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  userProfile: null;
  isLoading: boolean;
  isBanned: boolean;
  accessTier: "free";
  login: (provider: string) => Promise<void>;
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

  const login = async (provider: string) => {
    if (!auth) return;
    if (provider !== "google") {
      throw new Error("Only Google sign-in is enabled.");
    }
    await signInWithPopup(auth, googleProvider);
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
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
