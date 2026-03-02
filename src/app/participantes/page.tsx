"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, CheckCircle2, XCircle, Users, X } from "lucide-react";
import * as api from "../../lib/api";
import { Participant, ParticipantFormData } from "@/src/models/Participant";
import { Event } from "@/src/models/Event";
import { AppLayout } from "../../components/layout/AppLayout";
import { AuthGuard } from "../../components/AuthGuard";

export default function ParticipantesPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <ParticipantesContent />
      </AppLayout>
    </AuthGuard>
  );
}

const EMPTY_FORM: ParticipantFormData = {
  name: "", email: "", phone: "", eventId: "",
};

function ParticipantesContent() {
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [eventos,       setEventos]       = useState<Event[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterEvento,  setFilterEvento]  = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<Participant | null>(null);
  const [form,      setForm]      = useState<ParticipantFormData>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([api.getParticipantes(), api.getEvents()]);
      setParticipantes(p);
      setEventos(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, eventId: eventos[0]?.id ?? "" });
    setFormError(""); setModalOpen(true);
  }

  function openEdit(p: Participant) {
    setEditing(p);
    setForm({ name: p.name, email: p.email, phone: p.phone, eventId: p.eventId });
    setFormError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.eventId) {
      setFormError("Preencha nome, e-mail e evento."); return;
    }
    setSaving(true);
    try {
      editing
        ? await api.updateParticipante(editing.id, form)
        : await api.createParticipante(form);
      setModalOpen(false); await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await api.deleteParticipante(id); setDeletingId(null); await load();
  }

  async function toggleCheckin(p: Participant) {
    await api.updateParticipante(p.id, { checkin: !p.checkedIn });
    await load();
  }

  const filtered = participantes.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchEvento = filterEvento ? p.eventId === filterEvento : true;
    return matchSearch && matchEvento;
  });

  const checkinCount = filtered.filter((p) => p.checkedIn).length;

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Participantes</h1>
          <p className="page-subtitle">
            {filtered.length} participantes ·{" "}
            <span style={{ color: "var(--green-600)", fontWeight: 600 }}>
              {checkinCount} check-ins
            </span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo Participante
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="filters-bar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="input-fade"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select-fade"
          value={filterEvento}
          onChange={(e) => setFilterEvento(e.target.value)}
        >
          <option value="">Todos os eventos</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="card-fade" style={{ animation: "fadeSlideUp 0.4s ease both" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table-fade">
            <thead>
              <tr>
                <th>Participante</th>
                <th className="hidden-mobile">Evento</th>
                <th className="hidden-tablet">Telefone</th>
                <th>Check-in</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                      <Users size={40} className="empty-state-icon" />
                      <p className="empty-state-title">Nenhum participante encontrado</p>
                      <p className="empty-state-text">Tente ajustar os filtros ou cadastre um novo participante.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-cell-primary">{p.name}</div>
                      <div className="table-cell-secondary">{p.email}</div>
                    </td>
                    <td className="hidden-mobile">
                      <span style={{
                        maxWidth: 180, display: "block", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontSize: 13, color: "var(--neutral-600)",
                      }}>
                        {p.eventName}
                      </span>
                    </td>
                    <td className="hidden-tablet" style={{ fontSize: 13, color: "var(--neutral-500)" }}>
                      {p.phone || "—"}
                    </td>
                    <td>
                      <button
                        className={`checkin-btn ${p.checkedIn ? "done" : "pending"}`}
                        onClick={() => toggleCheckin(p)}
                        title={p.checkedIn ? "Desfazer check-in" : "Realizar check-in"}
                      >
                        {p.checkedIn
                          ? <><CheckCircle2 size={13} /> Realizado</>
                          : <><XCircle size={13} /> Pendente</>
                        }
                      </button>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="icon-btn" onClick={() => openEdit(p)} title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button className="icon-btn danger" onClick={() => setDeletingId(p.id)} title="Excluir">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      <FadeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Participante" : "Novo Participante"}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <><span className="spinner-fade" />{editing ? "Salvando…" : "Cadastrando…"}</>
                : (editing ? "Salvar" : "Cadastrar")
              }
            </button>
          </>
        }
      >
        <div className="form-space">
          {formError && <div className="error-alert">{formError}</div>}
          <Field label="Nome *">
            <input className="field-input-fade" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo" />
          </Field>
          <Field label="E-mail *">
            <input className="field-input-fade" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nome@email.com" />
          </Field>
          <Field label="Telefone">
            <input className="field-input-fade" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(81) 99999-0000" />
          </Field>
          <Field label="Evento *">
            <select className="field-select-fade" value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}>
              <option value="">Selecione um evento</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </FadeModal>

      {/* ── Delete Modal ── */}
      <FadeModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Confirmar exclusão"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeletingId(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => deletingId && handleDelete(deletingId)}>
              Excluir
            </button>
          </>
        }
      >
        <p style={{ color: "var(--neutral-600)", fontSize: 14, lineHeight: 1.6 }}>
          Tem certeza que deseja remover este participante?
        </p>
      </FadeModal>
    </>
  );
}

/* ─── Shared ──────────────────────────────────────────────────── */
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