
import * as jose from "jose";

export const AUTH_COOKIE_NAME = "auth_token";

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET ?? "fade-dev-secret-key"
);

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/** Decodifica sem verificar assinatura — use só no cliente para ler dados */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jose.decodeJwt(token) as JWTPayload;
  } catch {
    return null;
  }
}