import { AUTH_COOKIE_NAME } from "./auth";

// ─── SERVIDOR (Next.js Route Handlers / Server Actions) ───────────────────────
// Use `cookies()` do next/headers no server side.

// ─── CLIENTE ──────────────────────────────────────────────────────────────────

/**
 * Salva o JWT em um cookie acessível pelo JS do cliente.
 * Em produção com Route Handler real, use Set-Cookie com HttpOnly no servidor.
 */
export function setClientCookie(token: string, days = 1): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  // Secure e SameSite=Strict para máxima segurança
  document.cookie = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `expires=${expires.toUTCString()}`,
    "path=/",
    "SameSite=Strict",
    // Em HTTPS adicione: 'Secure'
  ].join("; ");
}

export function getClientCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeClientCookie(): void {
  document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}
