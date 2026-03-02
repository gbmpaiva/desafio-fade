// proxy.ts  (Next.js 16+)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const AUTH_COOKIE_NAME = "auth_token";
const PUBLIC_ROUTES = ["/login"];

// Mesma chave usada no MSW handler
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET ?? "fade-dev-secret-key"
);

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jose.jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Arquivos estáticos — nunca interceptar ────────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/mockServiceWorker.js") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // ── Rotas de API ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // ── Redireciona "/" → "/dashboard" ───────────────────────────────────────
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Verifica autenticação ─────────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
  const authenticated = token ? await isValidToken(token) : false;

  if (isPublicRoute && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicRoute && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|mockServiceWorker.js|assets).*)",
  ],
};