"use client";

import { useEffect, useState } from "react";
import {
  X, Calendar, MapPin, Users, Clock, Shield,
  CheckCircle2, XCircle, AlertTriangle, QrCode,
  FileText, Mail, List, UserCheck, ChevronRight,
  TrendingUp, Zap, Lock, Ban
} from "lucide-react";
import { Event, EventStatus } from "@/src/models/Event";
import { CheckinRule, CheckinRuleType } from "@/src/models/CheckinRule";

/* ─── Types ──────────────────────────────────────────────── */
interface EventDetailModalProps {
  eventId: string;
  onClose: () => void;
  onEditRules?: () => void;
}

interface ParticipantSummary {
  total: number;
  checkedIn: number;
}

/* ─── Constants ──────────────────────────────────────────── */
const STATUS_META: Record<EventStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:    { label: "Ativo",      color: "#10b981", bg: "#10b98118", icon: <CheckCircle2 size={13} /> },
  closed:    { label: "Encerrado",  color: "#6b7280", bg: "#6b728018", icon: <Lock size={13} /> },
  cancelled: { label: "Cancelado",  color: "#ef4444", bg: "#ef444418", icon: <Ban size={13} /> },
};

const RULE_TYPE_META: Record<CheckinRuleType, { label: string; icon: React.ReactNode; color: string }> = {
  qr_code:             { label: "QR Code",           icon: <QrCode size={13} />,    color: "#6366f1" },
  document:            { label: "Documento",          icon: <FileText size={13} />,  color: "#0ea5e9" },
  printed_list:        { label: "Lista Impressa",     icon: <List size={13} />,      color: "#8b5cf6" },
  email_confirmation:  { label: "Confirm. Email",     icon: <Mail size={13} />,      color: "#f59e0b" },
  manual_verification: { label: "Verificação Manual", icon: <UserCheck size={13} />, color: "#10b981" },
};

/* ─── Helpers ────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isEventPast(date: string) {
  return new Date(date) < new Date();
}

function canEditRules(event: Event) {
  if (event.status === "closed" || event.status === "cancelled") return false;
  if (isEventPast(event.date)) return false;
  return true;
}

function occupancyColor(pct: number) {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#10b981";
}

/* ─── Main Component ─────────────────────────────────────── */
export function EventDetailModal({ eventId, onClose, onEditRules }: EventDetailModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [rules, setRules] = useState<CheckinRule[]>([]);
  const [participants, setParticipants] = useState<ParticipantSummary>({ total: 0, checkedIn: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [evRes, rulesRes, partRes] = await Promise.all([
          fetch(`/api/eventos/${eventId}`),
          fetch(`/api/eventos/${eventId}/regras-checkin`),
          fetch(`/api/participantes?eventId=${eventId}`),
        ]);

        if (!evRes.ok) throw new Error("Evento não encontrado.");

        const evData: Event = await evRes.json();
        const rulesData: CheckinRule[] = rulesRes.ok ? await rulesRes.json() : [];
        const partData: { checkedIn?: boolean }[] = partRes.ok ? await partRes.json() : [];

        setEvent(evData);
        setRules(rulesData.sort((a, b) => a.order - b.order));
        setParticipants({
          total: partData.length,
          checkedIn: partData.filter((p) => p.checkedIn).length,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar evento.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  return (
    <div className="edm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="edm-modal">

        {/* ── Header ── */}
        <div className="edm-header">
          <div className="edm-header-icon">
            <Calendar size={18} />
          </div>
          <div className="edm-header-text">
            <h2 className="edm-title">{loading ? "Carregando…" : event?.name ?? "Evento"}</h2>
            <p className="edm-subtitle">Visão geral do evento</p>
          </div>
          <button className="edm-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* ── Body ── */}
        <div className="edm-body">

          {loading && <LoadingSkeleton />}
          {error && <ErrorState message={error} />}

          {!loading && !error && event && (
            <>
              {/* Status + data/hora */}
              <div className="edm-hero">
                <StatusBadge status={event.status} />
                {isEventPast(event.date) && event.status === "active" && (
                  <span className="edm-past-badge">
                    <AlertTriangle size={12} /> Já ocorreu
                  </span>
                )}
                <div className="edm-hero-info">
                  <div className="edm-hero-row">
                    <Calendar size={15} />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="edm-hero-row">
                    <Clock size={15} />
                    <span>{formatTime(event.date)}</span>
                  </div>
                  <div className="edm-hero-row">
                    <MapPin size={15} />
                    <span>{event.location}</span>
                  </div>
                </div>
                {event.description && (
                  <p className="edm-description">{event.description}</p>
                )}
              </div>

              {/* Métricas */}
              <div className="edm-metrics">
                <MetricCard
                  label="Capacidade"
                  value={event.capacity}
                  icon={<Users size={16} />}
                  color="#6366f1"
                />
                <MetricCard
                  label="Inscritos"
                  value={participants.total}
                  icon={<TrendingUp size={16} />}
                  color="#0ea5e9"
                  sub={`${Math.round((participants.total / event.capacity) * 100)}% da capacidade`}
                  subColor={occupancyColor((participants.total / event.capacity) * 100)}
                />
                <MetricCard
                  label="Check-ins"
                  value={participants.checkedIn}
                  icon={<CheckCircle2 size={16} />}
                  color="#10b981"
                  sub={participants.total > 0
                    ? `${Math.round((participants.checkedIn / participants.total) * 100)}% dos inscritos`
                    : "—"}
                />
              </div>

              {/* Barra de ocupação */}
              <OccupancyBar
                total={event.capacity}
                inscribed={participants.total}
                checkedIn={participants.checkedIn}
              />

              {/* Regras de check-in */}
              <div className="edm-section">
                <div className="edm-section-header">
                  <div className="edm-section-title">
                    <Shield size={14} />
                    Regras de Check-in
                    <span className="edm-count">
                      {rules.filter(r => r.isActive).length}/{rules.length} ativas
                    </span>
                  </div>

                  {canEditRules(event) && onEditRules && (
                    <button className="edm-edit-rules-btn" onClick={onEditRules}>
                      <Zap size={13} /> Editar regras <ChevronRight size={12} />
                    </button>
                  )}

                  {!canEditRules(event) && (
                    <span className="edm-rules-locked">
                      <Lock size={12} /> Edição bloqueada
                    </span>
                  )}
                </div>

                {rules.length === 0 ? (
                  <div className="edm-rules-empty">
                    <Shield size={24} />
                    <span>Nenhuma regra configurada</span>
                  </div>
                ) : (
                  <div className="edm-rules-list">
                    {rules.map((rule) => (
                      <RuleRow key={rule.id} rule={rule} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatusBadge({ status }: { status: EventStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="edm-status" style={{ color: meta.color, background: meta.bg }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function MetricCard({ label, value, icon, color, sub, subColor }: {
  label: string; value: number; icon: React.ReactNode;
  color: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="edm-metric">
      <div className="edm-metric-icon" style={{ color, background: `${color}18` }}>{icon}</div>
      <div className="edm-metric-body">
        <span className="edm-metric-value">{value.toLocaleString("pt-BR")}</span>
        <span className="edm-metric-label">{label}</span>
        {sub && <span className="edm-metric-sub" style={{ color: subColor }}>{sub}</span>}
      </div>
    </div>
  );
}

function OccupancyBar({ total, inscribed, checkedIn }: {
  total: number; inscribed: number; checkedIn: number;
}) {
  const inscribedPct = Math.min((inscribed / total) * 100, 100);
  const checkedInPct = Math.min((checkedIn / total) * 100, 100);
  const color = occupancyColor(inscribedPct);

  return (
    <div className="edm-occupancy">
      <div className="edm-occupancy-track">
        <div className="edm-occupancy-fill" style={{ width: `${inscribedPct}%`, background: `${color}30` }} />
        <div className="edm-occupancy-checkin" style={{ width: `${checkedInPct}%`, background: color }} />
      </div>
      <div className="edm-occupancy-legend">
        <span style={{ color }}><span className="edm-dot" style={{ background: color }} /> {checkedIn} check-ins</span>
        <span style={{ color: "#94a3b8" }}><span className="edm-dot" style={{ background: "#94a3b840" }} /> {inscribed} inscritos</span>
        <span style={{ color: "#475569" }}>Capacidade: {total}</span>
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: CheckinRule }) {
  const meta = RULE_TYPE_META[rule.type];
  return (
    <div className={`edm-rule-row ${!rule.isActive ? "edm-rule-inactive" : ""}`}>
      <div className="edm-rule-icon" style={{ color: meta.color, background: `${meta.color}18` }}>
        {meta.icon}
      </div>
      <div className="edm-rule-info">
        <span className="edm-rule-name">{rule.name || meta.label}</span>
        <span className="edm-rule-window">
          <Clock size={10} />
          {rule.timeWindow.before}min antes · {rule.timeWindow.after}min depois
        </span>
      </div>
      <div className="edm-rule-badges">
        {rule.isRequired && (
          <span className="edm-rule-badge" style={{ color: "#f59e0b", background: "#f59e0b18" }}>obrigatório</span>
        )}
        {!rule.isActive && (
          <span className="edm-rule-badge" style={{ color: "#6b7280", background: "#6b728018" }}>inativo</span>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="edm-skeleton-wrap">
      {[80, 60, 100, 40, 90].map((w, i) => (
        <div key={i} className="edm-skeleton" style={{ width: `${w}%`, animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="edm-error">
      <XCircle size={28} />
      <span>{message}</span>
    </div>
  );
}