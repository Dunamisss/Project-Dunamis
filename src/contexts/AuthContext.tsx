import { createContext, useContext } from "react";
import type { ReactNode } from "react";

// Minimal stubbed AuthContext to remove Firebase dependency.
interface AuthContextType {
  user: null;
  userProfile: null;
  isLoading: boolean;
  isBanned: boolean;
  accessTier: "free";
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stub: AuthContextType = {
    user: null,
    userProfile: null,
    isLoading: false,
    isBanned: false,
    accessTier: "free",
    login: async () => {},
    logout: async () => {},
  };

  return <AuthContext.Provider value={stub}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
