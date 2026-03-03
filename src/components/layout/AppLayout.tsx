"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Image from "next/image";
import fade_logo from "../../../public/fade_logo.png";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/participantes", label: "Participantes", icon: Users },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex" style={{ background: "#f4f4f5", fontFamily: "'DM Sans', sans-serif" }}>

      <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>

        <div className="logo-block">
          <div className="logo-wrap">
            
              <Image src="/assets/fade_logo.png" alt="Logo" width={44} height={44} />
        
            <div className="logo-texts">
              <div className="name">Fade UFPE</div>
              
            </div>
            <button
              className="menu-btn"
              style={{ marginLeft: "auto", display: "none" }}
              id="close-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="nav-section">
          <div className="nav-group-label">Menu principal</div>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-item ${active ? "active" : ""}`}
              >
                <span className="nav-icon"><Icon className="h-4 w-4" /></span>
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5" style={{ opacity: 0.6 }} />}
              </Link>
            );
          })}
        </nav>

        <div className="divider" />

        <div className="user-section">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? "U"}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="user-name">{user?.name || "Usuário"}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button onClick={logout} className="logout-btn">
            <LogOut className="h-3.5 w-3.5" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </button>
          <span className="mobile-brand">Fade ufpe</span>
        </header>
        <main style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}