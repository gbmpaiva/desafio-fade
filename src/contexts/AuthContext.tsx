"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as api from "../lib/api";
import { User } from "../models/User";
import { LoginCredentials } from "../models/LoginCredentials";
import { AuthContextType } from "../models/AuthContextType";
import {
  setClientCookie,
  getClientCookie,
  removeClientCookie,
} from "../lib/cookies";
import { decodeToken } from "../lib/auth";

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Inner Provider (usa useSearchParams aqui dentro) ─────────────────────────

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ seguro dentro do Suspense

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getClientCookie();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    const payload = decodeToken(storedToken);

    if (!payload) {
      removeClientCookie();
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    setUser({ id: payload.sub, email: payload.email } as User);
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await api.login(credentials);

      setClientCookie(response.token);
      setToken(response.token);
      setUser(response.user);

      router.refresh();
      await new Promise((r) => setTimeout(r, 50));

      const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
      router.replace(callbackUrl);
    },
    [router, searchParams]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout?.();
    } catch {
      // ignora erros de rede no logout
    } finally {
      removeClientCookie();
      setToken(null);
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Provider público (envolve com Suspense) ──────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Suspense>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}