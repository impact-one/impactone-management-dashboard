import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { clearSessionToken, readSessionToken, writeSessionToken } from "../lib/session";
import type { Envelope, User } from "../types";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!readSessionToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    api<Envelope<User>>("/auth/me")
      .then((result) => setUser(result.data))
      .catch(() => {
        clearSessionToken();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      async login(email: string, password: string) {
        const result = await api<Envelope<{ user: User; token: string }>>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        writeSessionToken(result.data.token);
        setUser(result.data.user);
      },
      async logout() {
        try {
          await api("/auth/logout", { method: "POST" });
        } finally {
          clearSessionToken();
          setUser(null);
        }
      },
    }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}
