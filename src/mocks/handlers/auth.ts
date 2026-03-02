import { http, HttpResponse, delay } from "msw";
import * as jose from "jose";
import { MOCK_USERS } from "../data/store";

// Em produção use process.env.JWT_SECRET (server-side)
// No MSW (browser) usamos NEXT_PUBLIC_ para expor ao cliente
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET ?? "fade-dev-secret-key"
);

export const authHandlers = [
  // ── LOGIN ──────────────────────────────────────────────────────────────────
  http.post("/api/auth/login", async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const user = MOCK_USERS.find(
      (u) => u.email === body.email && u.password === body.password
    );

    if (!user) {
      return HttpResponse.json(
        { message: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    // JWT real assinado com HS256
    const token = await new jose.SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(JWT_SECRET);

    const { password: _pw, ...safeUser } = user;

    return HttpResponse.json({ token, user: safeUser }, { status: 200 });
  }),

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  http.post("/api/auth/logout", async () => {
    await delay(200);
    return HttpResponse.json(
      { message: "Logout realizado com sucesso." },
      { status: 200 }
    );
  }),

  // ── ME ─────────────────────────────────────────────────────────────────────
  http.get("/api/auth/me", async ({ request }) => {
    await delay(200);

    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/auth_token=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      return HttpResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);

      const user = MOCK_USERS.find((u) => u.id === payload.sub);
      if (!user) {
        return HttpResponse.json(
          { message: "Usuário não encontrado." },
          { status: 404 }
        );
      }

      const { password: _pw, ...safeUser } = user;
      return HttpResponse.json({ user: safeUser }, { status: 200 });
    } catch {
      return HttpResponse.json(
        { message: "Token inválido ou expirado." },
        { status: 401 }
      );
    }
  }),
];