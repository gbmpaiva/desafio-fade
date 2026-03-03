"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Settings, Search, CalendarDays, X, Eye } from "lucide-react";
import * as api from "../../lib/api";
import { Event, EventFormData } from "@/src/models/Event";
import { AppLayout } from "../../components/layout/AppLayout";
import { AuthGuard } from "../../components/AuthGuard";
import { CheckinRulesPage } from "../../components/layout/CheckinRulesPage";
import { EventDetailModal } from "../../components/layout/EventDetail"; 

export default function EventosPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <EventosContent />
      </AppLayout>
    </AuthGuard>
  );
}

/* ─── helpers ──────────────────────────────────────────────────── */
type StatusVariant = "green" | "gray" | "red";

function statusInfo(s: Event["status"]): { variant: StatusVariant; label: string } {
  return ({
    active:    { variant: "green" as StatusVariant, label: "Ativo" },
    closed:    { variant: "gray"  as StatusVariant, label: "Encerrado" },
    cancelled: { variant: "red"   as StatusVariant, label: "Cancelado" },
  })[s];
}

const STATUS_OPTIONS = [
  { value: "active",    label: "Ativo" },
  { value: "closed",    label: "Encerrado" },
  { value: "cancelled", label: "Cancelado" },
];

const EMPTY_FORM: EventFormData = {
  name: "", description: "", date: "", location: "", capacity: 100, status: "active",
};

/* ─── Component ─────────────────────────────────────────────────── */
function EventosContent() {
  const [eventos, setEventos] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<Event | null>(null);
  const [form,      setForm]      = useState<EventFormData>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");

  const [regrasOpen,   setRegrasOpen]   = useState(false);
  const [regrasEvento, setRegrasEvento] = useState<Event | null>(null);

  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [viewingEventId, setViewingEventId] = useState<string | null>(null); // ← estado do modal de detalhes

  async function load() {
    setLoading(true);
    try { setEventos(await api.getEvents()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  /* ── CRUD ── */
  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setFormError(""); setModalOpen(true);
  }

  function openEdit(e: Event) {
    setEditing(e);
    setForm({
      name: e.name,
      description: e.description,
      date: e.date.slice(0, 16),
      location: e.location,
      capacity: e.capacity,
      status: e.status,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.date || !form.location) {
      setFormError("Preencha os campos obrigatórios."); return;
    }
    setSaving(true);
    try {
      editing ? await api.updateEvent(editing.id, form) : await api.createEvent(form);
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteEvent(id);
    setDeletingId(null);
    await load();
  }

  /* ── Regras ── */
  function openRegras(evento: Event) {
    setRegrasEvento(evento);
    setRegrasOpen(true);
  }

  
  function handleEditRulesFromDetail() {
    const evento = eventos.find((e) => e.id === viewingEventId) ?? null;
    setViewingEventId(null);
    if (evento) openRegras(evento);
  }

  /* ── Filter ── */
  const filtered = eventos.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Eventos</h1>
          <p className="page-subtitle">{eventos.length} eventos cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo Evento
        </button>
      </div>

      {/* ── Search ── */}
      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="input-fade"
            placeholder="Buscar por nome ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card-fade" style={{ animation: "fadeSlideUp 0.4s ease both" }}>
        <div className="overflow-x-auto">
          <table className="table-fade">
            <thead>
              <tr>
                <th>Evento</th>
                <th className="hidden-mobile">Data</th>
                <th className="hidden-tablet">Capacidade</th>
                <th>Status</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="skeleton-cell" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <CalendarDays size={40} className="empty-state-icon" />
                      <p className="empty-state-title">Nenhum evento encontrado</p>
                      <p className="empty-state-text">Tente ajustar a busca ou crie um novo evento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((evento) => {
                  const { variant, label } = statusInfo(evento.status);
                  const pct = Math.min((evento.participantCount / evento.capacity) * 100, 100);
                  return (
                    <tr key={evento.id}>
                      <td>
                        <div className="table-cell-primary">{evento.name}</div>
                        <div className="table-cell-secondary">{evento.location}</div>
                      </td>
                      <td className="hidden-mobile">
                        {new Date(evento.date).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="hidden-tablet">
                        <div className="cap-bar-wrap">
                          <div className="cap-bar-track">
                            <div className="cap-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="cap-bar-label">
                            {evento.participantCount}/{evento.capacity}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${variant}`}>{label}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button className="icon-btn accent" title="Regras de Check-in" onClick={() => openRegras(evento)}>
                            <Settings size={15} />
                          </button>
                          <button className="icon-btn" title="Editar" onClick={() => openEdit(evento)}>
                            <Pencil size={15} />
                          </button>
                          {/* ── Botão Visualizar ── */}
                          <button className="icon-btn accent" title="Visualizar detalhes" onClick={() => setViewingEventId(evento.id)}>
                            <Eye size={15} />
                          </button>
                          <button className="icon-btn danger" title="Excluir" onClick={() => setDeletingId(evento.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Detalhes do Evento ── */}
      {viewingEventId && (
        <EventDetailModal
          eventId={viewingEventId}
          onClose={() => setViewingEventId(null)}
          onEditRules={handleEditRulesFromDetail} // ← fecha detalhes e abre regras
        />
      )}

      {/* ── Modal Criar / Editar ── */}
      <FadeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Evento" : "Novo Evento"}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <><span className="spinner-fade" />{editing ? "Salvando…" : "Criando…"}</>
                : (editing ? "Salvar" : "Criar")}
            </button>
          </>
        }
      >
        <div className="form-space">
          {formError && <div className="error-alert">{formError}</div>}
          <Field label="Nome *">
            <input className="field-input-fade" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <textarea className="field-input-fade field-textarea-fade" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="form-row">
            <Field label="Data e Hora *">
              <input className="field-input-fade" type="datetime-local" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Capacidade">
              <input className="field-input-fade" type="number" min={1} value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Local *">
            <input className="field-input-fade" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="field-select-fade" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as EventFormData["status"] })}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
      </FadeModal>

      {/* ── Modal Excluir ── */}
      <FadeModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Confirmar exclusão"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeletingId(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => deletingId && handleDelete(deletingId)}>Excluir</button>
          </>
        }
      >
        <p style={{ color: "var(--neutral-600)", fontSize: 14, lineHeight: 1.6 }}>
          Tem certeza que deseja excluir este evento?<br />
          <strong style={{ color: "var(--neutral-800)" }}>Esta ação não pode ser desfeita.</strong>
        </p>
      </FadeModal>

      {/* ── Modal Regras de Check-in ── */}
      {regrasOpen && regrasEvento && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRegrasOpen(false)}>
          <div className="modal-box modal-box-wide">
            <CheckinRulesPage
              eventId={regrasEvento.id}
              eventName={regrasEvento.name}
              onClose={() => setRegrasOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Shared sub-components ───────────────────────────────────── */
function FadeModal({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label className="field-label-fade">{label}</label>
      {children}
    </div>
  );
}