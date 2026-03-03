"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../../contexts/AuthContext";
import "./login.css";

export default function LoginPage() {
 const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Enquanto ainda verifica a sessão ou já está autenticado, não renderiza o form
  if (isLoading || isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }
  

  return (
    <div className="login-root">

      {/* ── LEFT PANEL ── */}
      <div className="left-panel">
        <div className="left-panel-grid" />
        <div className="left-panel-bg-circle c1" />
        <div className="left-panel-bg-circle c2" />
        <div className="left-panel-bg-circle c3" />

        <div className="left-content">
          {/* FADE Logo real */}
          <div className="fade-logo-block">
            <div className="fade-logo-emblem">
              <Image
                src="/assets/fade_logo.png"
                alt="Logo FADE UFPE"
                width={88}
                height={88}
                className="fade-logo-img"
                priority
              />
              <div className="fade-wordmark">
                <span className="fade-title">FADE</span>
                <span className="fade-subtitle-text">
                  Fundação de Apoio ao<br />Desenvolvimento da UFPE
                </span>
              </div>
            </div>
          </div>

          <div className="left-divider" />

          <h2 className="left-headline">
            Gestão de Eventos<br />Universitários
          </h2>
          <p className="left-desc">
            Plataforma integrada para criação, controle e acompanhamento de
            eventos e atividades acadêmicas da UFPE.
          </p>

          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-number">2.4k+</div>
              <div className="stat-label">Eventos realizados</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">98%</div>
              <div className="stat-label">Satisfação</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right-panel">
        <div className="login-card">

          {/* Mobile logo */}
          <div className="mobile-logo">
            <div className="mobile-logo-row">
              <Image
                src="/assets/fade_logo.png.png"
                alt="Logo FADE UFPE"
                width={56}
                height={56}
                className="mobile-logo-img"
                priority
              />
              <span className="mobile-fade-title">FADE</span>
            </div>
            <span className="mobile-fade-sub">
              Fundação de Apoio ao Desenvolvimento da UFPE
            </span>
          </div>

          {/* Card header */}
          <div className="card-header">
            <div className="card-eyebrow">Portal de Acesso</div>
            <div className="card-title">
              Bem-vindo<br />
              <span className="card-title-accent">de volta</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <div className="field-wrap">
                <label className="field-label" htmlFor="email">
                  E-mail institucional
                </label>
                <input
                  className="field-input"
                  id="email"
                  type="email"
                  placeholder="nome@fade.org.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="field-wrap">
                <label className="field-label" htmlFor="password">
                  Senha
                </label>
                <input
                  className="field-input"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="forgot-row">
              <a href="#" className="forgot-link">Esqueceu a senha?</a>
            </div>

            {error && (
              <div className="error-box">
                <svg className="error-icon" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="error-text">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar plataforma
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="card-footer">
            <div className="footer-text">Sistema de Gestão de Eventos</div>
            <div className="footer-ufpe">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1L1 5v5c0 3.5 3 6 7 7 4-1 7-3.5 7-7V5L8 1z"
                  fill="#ddd"
                  stroke="#ccc"
                  strokeWidth="1"
                />
              </svg>
              FADE · UFPE · Recife, PE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
