"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Users, CheckCircle, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import * as api from "../../lib/api";
import { DashboardStats } from "@/src/models/Dashboard";
import { Event } from "@/src/models/Event";
import { AppLayout } from "../../components/layout/AppLayout";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../contexts/AuthContext";

/* ─── helpers ────────────────────────────────────────────────── */
function statusColor(s: Event["status"]) {
  return { active: "green", closed: "gray", cancelled: "red" }[s] as
    | "green"
    | "gray"
    | "red";
}

function statusLabel(s: Event["status"]) {
  return { active: "Ativo", closed: "Encerrado", cancelled: "Cancelado" }[s];
}

/* ─── Page export ────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </AuthGuard>
  );
}

/* ─── Content ────────────────────────────────────────────────── */
function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboardStats(), api.getEvents()])
      .then(([s, e]) => {
        setStats(s);
        setEvents(e.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "Bem-vindo";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      {/* ── Greeting ── */}
      <div className="greeting-bar">
        <div>
          <h1 className="greeting-title">
            {greeting}, {firstName} 👋
          </h1>
          <p className="greeting-sub">Aqui está um resumo do sistema FADE.</p>
        </div>
        <Link href="/eventos" className="btn btn-primary" style={{ height: 38 }}>
          <CalendarDays size={15} /> Ver Eventos
        </Link>
      </div>

      {/* ── Stats grid ── */}
      {loading ? (
        <div className="stats-grid stagger">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 120,
                background: "var(--neutral-100)",
                borderRadius: "var(--radius-lg)",
                animation: "shimmer 1.4s infinite",
                backgroundSize: "200% 100%",
              }}
            />
          ))}
        </div>
      ) : (
        <div className="stats-grid stagger">
          <StatCard
            color="red"
            icon={<CalendarDays size={20} />}
            label="Total de Eventos"
            value={stats?.totalEvents ?? 0}
          />
          <StatCard
            color="green"
            icon={<TrendingUp size={20} />}
            label="Eventos Ativos"
            value={stats?.activeEvents ?? 0}
          />
          <StatCard
            color="blue"
            icon={<Users size={20} />}
            label="Participantes"
            value={stats?.totalParticipants ?? 0}
          />
          <StatCard
            color="amber"
            icon={<CheckCircle size={20} />}
            label="Check-ins Hoje"
            value={stats?.checkinToday ?? 0}
          />
        </div>
      )}

      {/* ── Recent events ── */}
      <div className="card-fade" style={{ animation: "fadeSlideUp 0.5s 0.2s ease both" }}>
        <div className="card-header-fade">
          <div>
            <div className="card-title-fade">Eventos Recentes</div>
            <div className="card-subtitle-fade">Últimos eventos cadastrados</div>
          </div>
          <Link
            href="/eventos"
            className="btn btn-ghost"
            style={{ height: 32, fontSize: 12, gap: 4 }}
          >
            Ver todos <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "12px 0" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="event-list-row" style={{ gap: 12 }}>
                <div className="skeleton-cell" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }} />
                <div className="skeleton-cell" style={{ width: "55%", height: 14 }} />
                <div className="skeleton-cell" style={{ width: "20%", height: 14, marginLeft: "auto" }} />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={36} className="empty-state-icon" />
            <p className="empty-state-title">Nenhum evento encontrado</p>
          </div>
        ) : (
          events.map((e) => {
            const color = statusColor(e.status);
            const pct = Math.min((e.participantCount / e.capacity) * 100, 100);
            return (
              <div key={e.id} className="event-list-row">
                <span className={`event-list-dot ${color}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="event-list-name">{e.name}</div>
                  <div className="event-list-meta">
                    {e.location} · {new Date(e.date).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <div className="cap-bar-wrap">
                    <div className="cap-bar-track">
                      <div className="cap-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="cap-bar-label">
                      {e.participantCount}/{e.capacity}
                    </span>
                  </div>
                  <span className={`badge badge-${color}`}>{statusLabel(e.status)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* ─── StatCard ───────────────────────────────────────────────── */
function StatCard({
  color,
  icon,
  label,
  value,
}: {
  color: "red" | "green" | "blue" | "amber";
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className={`stat-card-fade ${color}`}>
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-value">{value.toLocaleString("pt-BR")}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}