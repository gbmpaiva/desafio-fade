"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ── Rotas ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/eventos",       label: "Eventos",       icon: CalendarDays },
  { href: "/participantes", label: "Participantes", icon: Users },
];

/* ── Helper ─────────────────────────────────────────────────────── */
function initials(name?: string) {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

/* ═══════════════════════════════════════════════════════════════════
   IMPORTANTE: Este componente NÃO é um layout.tsx de rota do Next.js.
   Ele fica em  src/components/layout/AppLayout.tsx
   e é importado diretamente em cada page.tsx que precisar de sidebar.

   Exemplo de uso em dashboard/page.tsx:
     import { AppLayout } from "../../components/layout/AppLayout";
     export default function Page() {
       return <AppLayout><DashboardContent /></AppLayout>;
     }
═══════════════════════════════════════════════════════════════════ */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen]  = useState(false);

  // Fecha sidebar ao trocar de rota
//   useEffect(() => { setOpen(false); }, [pathname]);

  // Trava scroll enquanto menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const currentPage =
    NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "FADE";

  return (
    <>
      <style>{STYLES}</style>

      <div className="al-shell">

        {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
        <aside className={`al-sidebar${open ? " al-sidebar--open" : ""}`}>

          {/* Logo */}
          <Link href="/dashboard" className="al-logo">
            <Image
              src="/assets/fade_logo.png"
              alt="FADE UFPE"
              width={44}
              height={44}
              className="al-logo__img"
              priority
            />
            <div>
              <p className="al-logo__name">FADE</p>
              <p className="al-logo__sub">Gestão de Eventos</p>
            </div>
          </Link>

          {/* Navegação */}
          <nav className="al-nav">
            <span className="al-nav__label">Principal</span>

            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`al-nav__link${active ? " al-nav__link--active" : ""}`}
                >
                  <Icon size={17} className="al-nav__icon" />
                  <span>{label}</span>
                  {active && <ChevronRight size={13} className="al-nav__chevron" />}
                </Link>
              );
            })}
          </nav>

          {/* Usuário */}
          <div className="al-user">
            <div className="al-avatar al-avatar--sm">{initials(user?.name)}</div>
            <div className="al-user__info">
              <p className="al-user__name">{user?.name ?? "Usuário"}</p>
            </div>
            <button
              className="al-user__logout"
              title="Sair"
              onClick={() => { logout(); router.replace("/login"); }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        {/* ══ BACKDROP MOBILE ══════════════════════════════════════ */}
        {open && (
          <div
            className="al-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ══ ÁREA PRINCIPAL ═══════════════════════════════════════ */}
        <div className="al-main">

          {/* Topbar */}
          <header className="al-topbar">

            {/* Hambúrguer — só aparece no mobile via CSS */}
            <button
              className="al-topbar__burger"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Breadcrumb */}
            <div className="al-topbar__bc">
              <span className="al-topbar__brand">FADE</span>
              <ChevronRight size={13} className="al-topbar__sep" />
              <span className="al-topbar__page">{currentPage}</span>
            </div>

            {/* Ações */}
            <div className="al-topbar__actions">
              <button className="al-topbar__notif" title="Notificações">
                <Bell size={16} />
                <span className="al-topbar__dot" />
              </button>
              <div className="al-avatar al-avatar--topbar" title={user?.name}>
                {initials(user?.name)}
              </div>
            </div>
          </header>

          {/* Conteúdo da página */}
          <main className="al-content">{children}</main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ESTILOS — embutidos para não precisar de arquivo CSS externo
═══════════════════════════════════════════════════════════════════ */
const STYLES = `
.al-shell {
  display: flex;
  min-height: 100vh;
  background: #faf8f8;
  font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
}

/* ── Sidebar ── */
.al-sidebar {
  width: 248px;
  flex-shrink: 0;
  background: #150f0f;
  display: flex;
  flex-direction: column;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 200;
  transition: transform .28s cubic-bezier(.4,0,.2,1);
  box-shadow: 4px 0 32px rgba(0,0,0,.22);
}

/* ── Logo ── */
.al-logo {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  text-decoration: none;
}
.al-logo__img {
  width: 44px; height: 44px;
  object-fit: contain;
  mix-blend-mode: screen;
  filter: brightness(1.15) saturate(1.1);
  flex-shrink: 0;
}
.al-logo__name {
  font-family: var(--font-sora, 'Sora', sans-serif);
  font-size: 20px; font-weight: 800;
  color: #fff; letter-spacing: .06em; line-height: 1;
  margin: 0;
}
.al-logo__sub {
  font-size: 9.5px; color: rgba(255,255,255,.3);
  letter-spacing: .1em; text-transform: uppercase;
  margin: 3px 0 0; line-height: 1.4;
}

/* ── Nav ── */
.al-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex; flex-direction: column;
  overflow-y: auto; scrollbar-width: none;
}
.al-nav::-webkit-scrollbar { display: none; }
.al-nav__label {
  font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.22);
  padding: 14px 10px 8px; display: block;
}
.al-nav__link {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 10px;
  color: rgba(255,255,255,.5);
  font-size: 13.5px; font-weight: 500;
  text-decoration: none;
  transition: background .15s, color .15s;
  position: relative; margin-bottom: 2px;
}
.al-nav__link:hover {
  background: rgba(255,255,255,.07);
  color: rgba(255,255,255,.9);
}
.al-nav__link--active {
  background: rgba(192,24,30,.2);
  color: #fff;
}
.al-nav__link--active::before {
  content: '';
  position: absolute;
  left: -10px; top: 7px; bottom: 7px;
  width: 3px; background: #e03030;
  border-radius: 0 3px 3px 0;
}
.al-nav__icon { flex-shrink: 0; opacity: .65; transition: opacity .15s; }
.al-nav__link:hover .al-nav__icon,
.al-nav__link--active .al-nav__icon { opacity: 1; }
.al-nav__link--active .al-nav__icon { color: #e03030; }
.al-nav__chevron { margin-left: auto; opacity: .4; }

/* ── Usuário ── */
.al-user {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px 20px;
  border-top: 1px solid rgba(255,255,255,.07);
}
.al-user__info { flex: 1; min-width: 0; }
.al-user__name {
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,.85);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  line-height: 1.3; margin: 0;
}
.al-user__role { font-size: 11px; color: rgba(255,255,255,.3); margin: 1px 0 0; }
.al-user__logout {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 7px;
  cursor: pointer; color: rgba(255,255,255,.25);
  transition: background .15s, color .15s; flex-shrink: 0;
}
.al-user__logout:hover { background: rgba(192,24,30,.2); color: #e03030; }

/* ── Avatar reutilizável ── */
.al-avatar {
  border-radius: 50%;
  background: linear-gradient(135deg, #6e0009, #c0181e);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-sora, 'Sora', sans-serif);
  font-weight: 700; color: #fff;
  flex-shrink: 0; letter-spacing: .04em;
}
.al-avatar--sm   { width: 34px; height: 34px; font-size: 12px; }
.al-avatar--topbar { width: 34px; height: 34px; font-size: 11px; cursor: pointer; transition: box-shadow .15s; }
.al-avatar--topbar:hover { box-shadow: 0 0 0 3px rgba(192,24,30,.22); }

/* ── Backdrop mobile ── */
.al-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(2px);
  z-index: 199;
  animation: al-fade .2s ease;
}
@keyframes al-fade { from { opacity: 0; } to { opacity: 1; } }

/* ── Main ── */
.al-main {
  flex: 1;
  display: flex; flex-direction: column;
  min-height: 100vh;
  margin-left: 248px;
  transition: margin-left .28s cubic-bezier(.4,0,.2,1);
}

/* ── Topbar ── */
.al-topbar {
  height: 58px;
  background: #fff;
  border-bottom: 1px solid #e8e0e0;
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 28px; gap: 16px;
  position: sticky; top: 0; z-index: 100;
}
.al-topbar__burger {
  display: none;
  width: 36px; height: 36px;
  align-items: center; justify-content: center;
  border: none; background: none; border-radius: 8px;
  cursor: pointer; color: #5c4a4a;
  transition: background .15s, color .15s; flex-shrink: 0;
}
.al-topbar__burger:hover { background: #f3eeee; color: #150f0f; }
.al-topbar__bc {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #b09898; flex: 1; min-width: 0;
}
.al-topbar__brand {
  font-family: var(--font-sora, 'Sora', sans-serif);
  font-weight: 800; color: #9b0e13;
  letter-spacing: .05em; white-space: nowrap;
}
.al-topbar__sep { color: #d4c9c9; flex-shrink: 0; }
.al-topbar__page {
  font-weight: 600; color: #3d2f2f;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.al-topbar__actions {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.al-topbar__notif {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid #e8e0e0; border-radius: 9px;
  background: none; cursor: pointer; color: #8a6e6e;
  position: relative;
  transition: background .15s, border-color .15s, color .15s;
}
.al-topbar__notif:hover { background: #f3eeee; border-color: #d4c9c9; color: #281e1e; }
.al-topbar__dot {
  position: absolute; top: 8px; right: 8px;
  width: 6px; height: 6px;
  background: #c0181e; border-radius: 50%;
  border: 1.5px solid #fff;
}

/* ── Conteúdo ── */
.al-content { flex: 1; padding: 32px 28px; }

/* ── Responsivo ── */
@media (max-width: 900px) {
  .al-sidebar { transform: translateX(-100%); }
  .al-sidebar--open { transform: translateX(0); }
  .al-main { margin-left: 0 !important; }
  .al-topbar__burger { display: flex; }
  .al-content { padding: 24px 16px; }
}
@media (max-width: 480px) {
  .al-topbar { padding: 0 16px; height: 54px; }
  .al-content { padding: 20px 14px; }
}
`;