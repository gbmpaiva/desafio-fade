"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reidrata a sessão ao montar (F5, nova aba, etc.)
  useEffect(() => {
    const storedToken = getClientCookie();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Decodifica o payload do JWT sem chamar a API
    // Isso garante que o estado seja restaurado mesmo antes do MSW inicializar
    const payload = decodeToken(storedToken);

    if (!payload) {
      // Token malformado — descarta
      removeClientCookie();
      setIsLoading(false);
      return;
    }

    // Restaura o estado mínimo a partir do payload do token
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}