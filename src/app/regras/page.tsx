"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Trash2, GripVertical, AlertTriangle, CheckCircle2,
  Clock, QrCode, FileText, Mail, List, UserCheck,
  ChevronDown, X, AlertCircle, Info, Shield, Zap
} from "lucide-react";
import {
  CheckinRule,
  CheckinRuleType,
  CheckinRulesValidation,
  CHECKIN_SCENARIOS,
  CheckinScenario,
} from "@/src/models/CheckinRule";

/* ─── Types ─────────────────────────────────────────────── */
interface CheckinRulesPageProps {
  eventId: string;
  eventName?: string;
  onClose?: () => void;
}

interface DragState {
  draggingId: string | null;
  overId: string | null;
}

/* ─── Constants ─────────────────────────────────────────── */
const RULE_TYPE_META: Record<CheckinRuleType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  qr_code:             { label: "QR Code",              icon: <QrCode size={14} />,    color: "#6366f1", description: "Leitura de QR Code único por participante" },
  document:            { label: "Documento",            icon: <FileText size={14} />,  color: "#0ea5e9", description: "Verificação de documento com foto" },
  printed_list:        { label: "Lista Impressa",       icon: <List size={14} />,      color: "#8b5cf6", description: "Conferência em lista física impressa" },
  email_confirmation:  { label: "Confirmação Email",    icon: <Mail size={14} />,      color: "#f59e0b", description: "Link de confirmação enviado por email" },
  manual_verification: { label: "Verificação Manual",   icon: <UserCheck size={14} />, color: "#10b981", description: "Operador confirma presença manualmente" },
};

const EMPTY_RULE: Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt"> = {
  name: "",
  type: "qr_code",
  description: "",
  isActive: true,
  isRequired: true,
  timeWindow: { before: 15, after: 30 },
  order: 0,
};

/* ─── Helpers ────────────────────────────────────────────── */
function uid() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatWindow(before: number, after: number) {
  return `${before}min antes · ${after}min depois`;
}

function validateRules(rules: CheckinRule[]): CheckinRulesValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: CheckinRulesValidation["conflicts"] = [];

  const active = rules.filter((r) => r.isActive);
  const activeRequired = active.filter((r) => r.isRequired);

  if (active.length === 0)
    errors.push("Deve existir ao menos uma regra ativa.");

  if (activeRequired.length === 0 && active.length > 0)
    warnings.push("Nenhuma regra obrigatória ativa — o check-in será opcional.");

  // Verifica duplicidade de tipo entre obrigatórias
  const seenTypes = new Map<CheckinRuleType, CheckinRule>();
  for (const r of activeRequired) {
    if (seenTypes.has(r.type)) {
      const prev = seenTypes.get(r.type)!;
      conflicts.push({
        ruleId1: prev.id, ruleId2: r.id,
        ruleName1: prev.name, ruleName2: r.name,
        reason: `Duas regras obrigatórias do mesmo tipo "${RULE_TYPE_META[r.type].label}"`,
        severity: "warning",
      });
    } else {
      seenTypes.set(r.type, r);
    }
  }

  // Verifica janelas impossíveis (before+after = 0)
  for (const r of active) {
    if (r.timeWindow.before === 0 && r.timeWindow.after === 0) {
      errors.push(`"${r.name}": janela de validação zerada — ninguém conseguirá fazer check-in.`);
    }
    if (r.timeWindow.before + r.timeWindow.after < 5) {
      warnings.push(`"${r.name}": janela muito curta (${r.timeWindow.before + r.timeWindow.after} min total). Considere ampliar.`);
    }
  }

  // Verifica conflito real: obrigatórias com janelas sem sobreposição alguma
  // Ex.: regra A só antes do evento, regra B só depois — impossível cumprir ambas juntas
  for (let i = 0; i < activeRequired.length; i++) {
    for (let j = i + 1; j < activeRequired.length; j++) {
      const a = activeRequired[i];
      const b = activeRequired[j];
      // Se uma janela não inclui nenhum momento em que a outra também está aberta
      const aStart = -a.timeWindow.before;
      const aEnd   =  a.timeWindow.after;
      const bStart = -b.timeWindow.before;
      const bEnd   =  b.timeWindow.after;
      const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
      if (overlap <= 0) {
        conflicts.push({
          ruleId1: a.id, ruleId2: b.id,
          ruleName1: a.name, ruleName2: b.name,
          reason: `Janelas sem sobreposição: "${a.name}" e "${b.name}" nunca estarão abertas ao mesmo tempo.`,
          severity: "error",
        });
      }
    }
  }

  return {
    isValid: errors.length === 0 && conflicts.filter((c) => c.severity === "error").length === 0,
    errors,
    warnings,
    conflicts,
  };
}

/* ─── Main Component ─────────────────────────────────────── */
export function CheckinRulesPage({ eventId, eventName = "Evento", onClose }: CheckinRulesPageProps) {
  const [rules, setRules] = useState<CheckinRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<CheckinRulesValidation | null>(null);
  const [editingRule, setEditingRule] = useState<CheckinRule | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [drag, setDrag] = useState<DragState>({ draggingId: null, overId: null });
  const dragCounter = useRef(0);

  // ── Load ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/checkin/rules/${eventId}`);
        const data: CheckinRule[] = await res.json();
        setRules(data.sort((a, b) => a.order - b.order));
      } catch {
        setRules([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  // ── Auto-validate on change ──
  useEffect(() => {
    if (rules.length > 0) setValidation(validateRules(rules));
    else setValidation(null);
  }, [rules]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/checkin/rules/${eventId}/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [eventId, rules]);

  // ── CRUD ──
  function addRule(rule: Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const newRule: CheckinRule = {
      ...rule,
      id: uid(),
      eventId,
      order: rules.length,
      createdAt: now,
      updatedAt: now,
    };
    setRules((prev) => [...prev, newRule]);
    setIsAddingNew(false);
  }

  function updateRule(updated: CheckinRule) {
    setRules((prev) => prev.map((r) => r.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : r));
    setEditingRule(null);
  }

  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i })));
  }

  function toggleActive(id: string) {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive, updatedAt: new Date().toISOString() } : r));
  }

  function applyScenario(scenario: CheckinScenario) {
    const now = new Date().toISOString();
    const newRules: CheckinRule[] = scenario.rules.map((r, i) => ({
      ...r, id: uid(), eventId, order: i, createdAt: now, updatedAt: now,
    }));
    setRules(newRules);
    setShowScenarios(false);
  }

  // ── Drag & Drop ──
  function onDragStart(id: string) {
    setDrag({ draggingId: id, overId: null });
  }

  function onDragEnter(id: string) {
    dragCounter.current++;
    setDrag((d) => ({ ...d, overId: id }));
  }

  function onDragLeave() {
    dragCounter.current--;
    if (dragCounter.current === 0) setDrag((d) => ({ ...d, overId: null }));
  }

  function onDrop(targetId: string) {
    dragCounter.current = 0;
    setDrag({ draggingId: null, overId: null });
    if (!drag.draggingId || drag.draggingId === targetId) return;
    setRules((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((r) => r.id === drag.draggingId);
      const to   = arr.findIndex((r) => r.id === targetId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr.map((r, i) => ({ ...r, order: i }));
    });
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="crp-root">
      {/* Header */}
      <div className="crp-header">
        <div className="crp-header-left">
          <div className="crp-icon-wrap"><Shield size={18} /></div>
          <div>
            <h2 className="crp-title">Regras de Check-in</h2>
            <p className="crp-subtitle">{eventName}</p>
          </div>
        </div>
        <div className="crp-header-right">
          <button className="crp-btn crp-btn-ghost" onClick={() => setShowScenarios(true)}>
            <Zap size={14} /> Cenários
          </button>
          <button className="crp-btn crp-btn-primary" onClick={handleSave} disabled={saving || saved}>
            {saved ? <><CheckCircle2 size={14} /> Salvo!</> : saving ? "Salvando…" : "Salvar regras"}
          </button>
          {onClose && (
            <button className="crp-btn crp-btn-icon" onClick={onClose}><X size={16} /></button>
          )}
        </div>
      </div>

      <div className="crp-body">
        {/* Validation banner */}
        {validation && (
          <ValidationBanner validation={validation} />
        )}

        {/* Rules list */}
        <div className="crp-section">
          <div className="crp-section-header">
            <span className="crp-section-title">
              Regras configuradas
              <span className="crp-count">{rules.filter(r => r.isActive).length}/{rules.length} ativas</span>
            </span>
            <button className="crp-btn crp-btn-secondary" onClick={() => setIsAddingNew(true)}>
              <Plus size={14} /> Adicionar regra
            </button>
          </div>

          {loading ? (
            <div className="crp-loading">
              {[1,2,3].map(i => <div key={i} className="crp-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="crp-empty">
              <Shield size={36} className="crp-empty-icon" />
              <p className="crp-empty-title">Nenhuma regra configurada</p>
              <p className="crp-empty-text">Adicione regras ou escolha um cenário pronto para começar.</p>
              <button className="crp-btn crp-btn-primary" onClick={() => setIsAddingNew(true)}>
                <Plus size={14} /> Primeira regra
              </button>
            </div>
          ) : (
            <div className="crp-rules-list">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  conflictIds={validation?.conflicts.map(c => [c.ruleId1, c.ruleId2]).flat() ?? []}
                  isDragging={drag.draggingId === rule.id}
                  isOver={drag.overId === rule.id}
                  onEdit={() => setEditingRule(rule)}
                  onDelete={() => deleteRule(rule.id)}
                  onToggle={() => toggleActive(rule.id)}
                  onDragStart={() => onDragStart(rule.id)}
                  onDragEnter={() => onDragEnter(rule.id)}
                  onDragLeave={onDragLeave}
                  onDrop={() => onDrop(rule.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Timeline visual */}
        {rules.length > 0 && (
          <TimelinePreview rules={rules} />
        )}
      </div>

      {/* Modals */}
      {(isAddingNew || editingRule) && (
        <RuleFormModal
          rule={editingRule}
          onSave={(data) => editingRule ? updateRule({ ...editingRule, ...data }) : addRule(data)}
          onClose={() => { setIsAddingNew(false); setEditingRule(null); }}
        />
      )}

      {showScenarios && (
        <ScenariosModal
          onApply={applyScenario}
          onClose={() => setShowScenarios(false)}
        />
      )}

      <style>{CRP_STYLES}</style>
    </div>
  );
}

/* ─── RuleCard ───────────────────────────────────────────── */
function RuleCard({
  rule, conflictIds, isDragging, isOver,
  onEdit, onDelete, onToggle,
  onDragStart, onDragEnter, onDragLeave, onDrop,
}: {
  rule: CheckinRule;
  conflictIds: string[];
  isDragging: boolean;
  isOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const meta = RULE_TYPE_META[rule.type];
  const hasConflict = conflictIds.includes(rule.id);

  return (
    <div
      className={`crp-rule-card ${isDragging ? "crp-dragging" : ""} ${isOver ? "crp-drag-over" : ""} ${!rule.isActive ? "crp-inactive" : ""} ${hasConflict ? "crp-conflict" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Drag handle */}
      <div className="crp-drag-handle"><GripVertical size={14} /></div>

      {/* Type icon */}
      <div className="crp-rule-icon" style={{ color: meta.color, background: `${meta.color}18` }}>
        {meta.icon}
      </div>

      {/* Info */}
      <div className="crp-rule-info">
        <div className="crp-rule-name-row">
          <span className="crp-rule-name">{rule.name || meta.label}</span>
          <div className="crp-rule-badges">
            {rule.isRequired && <span className="crp-badge crp-badge-required">obrigatório</span>}
            {!rule.isActive && <span className="crp-badge crp-badge-inactive">inativo</span>}
            {hasConflict && <span className="crp-badge crp-badge-conflict"><AlertTriangle size={10} /> conflito</span>}
          </div>
        </div>
        <div className="crp-rule-meta">
          <span className="crp-rule-type" style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
          <span className="crp-rule-window"><Clock size={11} /> {formatWindow(rule.timeWindow.before, rule.timeWindow.after)}</span>
        </div>
        {rule.description && <p className="crp-rule-desc">{rule.description}</p>}
      </div>

      {/* Actions */}
      <div className="crp-rule-actions">
        <label className="crp-toggle" title={rule.isActive ? "Desativar" : "Ativar"}>
          <input type="checkbox" checked={rule.isActive} onChange={onToggle} />
          <span className="crp-toggle-track" />
        </label>
        <button className="crp-icon-btn" onClick={onEdit} title="Editar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className="crp-icon-btn crp-icon-btn-danger" onClick={onDelete} title="Remover">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Timeline Preview ────────────────────────────────────── */
function TimelinePreview({ rules }: { rules: CheckinRule[] }) {
  const active = rules.filter(r => r.isActive);
  if (active.length === 0) return null;

  const maxBefore = Math.max(...active.map(r => r.timeWindow.before), 0);
  const maxAfter  = Math.max(...active.map(r => r.timeWindow.after), 0);
  const total = maxBefore + maxAfter || 1;

  return (
    <div className="crp-timeline-section">
      <div className="crp-section-header">
        <span className="crp-section-title">Visualização da janela de check-in</span>
      </div>
      <div className="crp-timeline-wrap">
        <span className="crp-timeline-label crp-timeline-label-left">−{maxBefore}min</span>
        <div className="crp-timeline-track">
          {active.map((rule) => {
            const meta = RULE_TYPE_META[rule.type];
            const left  = ((maxBefore - rule.timeWindow.before) / total) * 100;
            const width = ((rule.timeWindow.before + rule.timeWindow.after)  / total) * 100;
            return (
              <div
                key={rule.id}
                className="crp-timeline-bar"
                style={{ left: `${left}%`, width: `${width}%`, background: `${meta.color}30`, borderColor: meta.color }}
                title={`${rule.name}: ${formatWindow(rule.timeWindow.before, rule.timeWindow.after)}`}
              >
                <span className="crp-timeline-bar-label" style={{ color: meta.color }}>{rule.name}</span>
              </div>
            );
          })}
          {/* Event marker */}
          <div className="crp-timeline-event" style={{ left: `${(maxBefore / total) * 100}%` }}>
            <div className="crp-timeline-event-line" />
            <span className="crp-timeline-event-label">Evento</span>
          </div>
        </div>
        <span className="crp-timeline-label crp-timeline-label-right">+{maxAfter}min</span>
      </div>
    </div>
  );
}

/* ─── Validation Banner ───────────────────────────────────── */
function ValidationBanner({ validation }: { validation: CheckinRulesValidation }) {
  const [expanded, setExpanded] = useState(true);
  const total = validation.errors.length + validation.warnings.length + validation.conflicts.length;
  if (total === 0 && validation.isValid) return (
    <div className="crp-banner crp-banner-ok">
      <CheckCircle2 size={15} /> Configuração válida — sem conflitos detectados.
    </div>
  );

  return (
    <div className={`crp-banner crp-banner-${validation.isValid ? "warn" : "error"}`}>
      <button className="crp-banner-toggle" onClick={() => setExpanded(e => !e)}>
        <AlertTriangle size={15} />
        <span>
          {!validation.isValid ? "Configuração inválida" : "Atenção"} —{" "}
          {validation.errors.length > 0 && `${validation.errors.length} erro(s)`}
          {validation.warnings.length > 0 && ` ${validation.warnings.length} aviso(s)`}
          {validation.conflicts.length > 0 && ` ${validation.conflicts.length} conflito(s)`}
        </span>
        <ChevronDown size={14} className={`crp-chevron ${expanded ? "crp-chevron-up" : ""}`} />
      </button>
      {expanded && (
        <div className="crp-banner-body">
          {validation.errors.map((e, i) => (
            <div key={i} className="crp-banner-item crp-banner-item-error">
              <AlertCircle size={13} /> {e}
            </div>
          ))}
          {validation.conflicts.map((c, i) => (
            <div key={i} className={`crp-banner-item crp-banner-item-${c.severity}`}>
              <AlertTriangle size={13} /> {c.reason}
            </div>
          ))}
          {validation.warnings.map((w, i) => (
            <div key={i} className="crp-banner-item crp-banner-item-warn">
              <Info size={13} /> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Rule Form Modal ─────────────────────────────────────── */
function RuleFormModal({
  rule, onSave, onClose,
}: {
  rule: CheckinRule | null;
  onSave: (data: Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}) {
  const isEdit = !!rule;
  const [form, setForm] = useState<Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt">>(
    rule
      ? { name: rule.name, type: rule.type, description: rule.description ?? "", isActive: rule.isActive, isRequired: rule.isRequired, timeWindow: { ...rule.timeWindow }, order: rule.order }
      : { ...EMPTY_RULE }
  );
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!form.name.trim()) { setError("Nome da regra é obrigatório."); return; }
    if (form.timeWindow.before < 0 || form.timeWindow.after < 0) { setError("Valores de janela devem ser ≥ 0."); return; }
    onSave(form);
  }

  const meta = RULE_TYPE_META[form.type];

  return (
    <div className="crp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="crp-modal">
        <div className="crp-modal-header">
          <h3 className="crp-modal-title">{isEdit ? "Editar regra" : "Nova regra de check-in"}</h3>
          <button className="crp-btn crp-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="crp-modal-body">
          {error && <div className="crp-form-error"><AlertCircle size={13} /> {error}</div>}

          {/* Type selector */}
          <div className="crp-form-field">
            <label className="crp-form-label">Tipo de verificação</label>
            <div className="crp-type-grid">
              {(Object.entries(RULE_TYPE_META) as [CheckinRuleType, typeof RULE_TYPE_META[CheckinRuleType]][]).map(([type, m]) => (
                <button
                  key={type}
                  className={`crp-type-option ${form.type === type ? "crp-type-selected" : ""}`}
                  onClick={() => setForm(f => ({ ...f, type, name: f.name || m.label }))}
                  style={form.type === type ? { borderColor: m.color, background: `${m.color}12` } : undefined}
                >
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <p className="crp-form-hint">{meta.description}</p>
          </div>

          {/* Name */}
          <div className="crp-form-field">
            <label className="crp-form-label">Nome da regra *</label>
            <input
              className="crp-form-input"
              value={form.name}
              placeholder={meta.label}
              onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setError(""); }}
            />
          </div>

          {/* Description */}
          <div className="crp-form-field">
            <label className="crp-form-label">Descrição <span className="crp-optional">(opcional)</span></label>
            <textarea
              className="crp-form-input crp-form-textarea"
              value={form.description}
              placeholder="Instrução exibida ao operador no momento do check-in…"
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Time window */}
          <div className="crp-form-field">
            <label className="crp-form-label">Janela de check-in</label>
            <div className="crp-window-row">
              <div className="crp-window-field">
                <label className="crp-window-label">Antes do evento (min)</label>
                <input
                  type="number" min={0} max={1440}
                  className="crp-form-input"
                  value={form.timeWindow.before}
                  onChange={(e) => setForm(f => ({ ...f, timeWindow: { ...f.timeWindow, before: Math.max(0, +e.target.value) } }))}
                />
              </div>
              <div className="crp-window-divider">→</div>
              <div className="crp-window-field">
                <label className="crp-window-label">Depois do evento (min)</label>
                <input
                  type="number" min={0} max={1440}
                  className="crp-form-input"
                  value={form.timeWindow.after}
                  onChange={(e) => setForm(f => ({ ...f, timeWindow: { ...f.timeWindow, after: Math.max(0, +e.target.value) } }))}
                />
              </div>
            </div>
            <p className="crp-form-hint">
              O check-in ficará disponível de <strong>{form.timeWindow.before}min antes</strong> até <strong>{form.timeWindow.after}min depois</strong> do horário do evento.
            </p>
          </div>

          {/* Flags */}
          <div className="crp-form-flags">
            <label className="crp-checkbox-row">
              <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm(f => ({ ...f, isRequired: e.target.checked }))} />
              <span>
                <strong>Obrigatório</strong> — participante deve cumprir esta regra para concluir o check-in
              </span>
            </label>
            <label className="crp-checkbox-row">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <span>
                <strong>Ativo</strong> — regra está habilitada para este evento
              </span>
            </label>
          </div>
        </div>
        <div className="crp-modal-footer">
          <button className="crp-btn crp-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="crp-btn crp-btn-primary" onClick={handleSubmit}>
            {isEdit ? "Salvar alterações" : "Adicionar regra"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Scenarios Modal ─────────────────────────────────────── */
function ScenariosModal({ onApply, onClose }: { onApply: (s: CheckinScenario) => void; onClose: () => void }) {
  return (
    <div className="crp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="crp-modal crp-modal-wide">
        <div className="crp-modal-header">
          <h3 className="crp-modal-title">Cenários prontos</h3>
          <button className="crp-btn crp-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="crp-modal-body">
          <p className="crp-modal-desc">Escolha um cenário para pré-configurar as regras. As regras atuais serão substituídas.</p>
          <div className="crp-scenarios-grid">
            {CHECKIN_SCENARIOS.map((s) => (
              <button key={s.name} className="crp-scenario-card" onClick={() => onApply(s)}>
                <span className="crp-scenario-name">{s.name}</span>
                <span className="crp-scenario-desc">{s.description}</span>
                <span className="crp-scenario-rules">{s.rules.length} regra{s.rules.length !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const CRP_STYLES = `
  .crp-root {
    font-family: 'DM Sans', -apple-system, sans-serif;
    background: #f8f9fb;
    min-height: 100%;
    color: #1a1d23;
  }

  /* Header */
  .crp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: #fff;
    border-bottom: 1px solid #e9eaed;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .crp-header-left { display: flex; align-items: center; gap: 12px; }
  .crp-header-right { display: flex; align-items: center; gap: 8px; }
  .crp-icon-wrap {
    width: 38px; height: 38px;
    background: #6366f115;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #6366f1;
  }
  .crp-title { font-size: 16px; font-weight: 650; letter-spacing: -0.3px; margin: 0; }
  .crp-subtitle { font-size: 12px; color: #6b7280; margin: 0; }

  /* Body */
  .crp-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }

  /* Buttons */
  .crp-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
    border: none; cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .crp-btn-primary { background: #6366f1; color: #fff; }
  .crp-btn-primary:hover { background: #4f51d9; }
  .crp-btn-primary:disabled { opacity: 0.55; cursor: default; }
  .crp-btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }
  .crp-btn-secondary:hover { background: #f9fafb; }
  .crp-btn-ghost { background: transparent; color: #6b7280; border: 1px solid transparent; }
  .crp-btn-ghost:hover { background: #f3f4f6; color: #374151; }
  .crp-btn-icon { padding: 7px; background: transparent; color: #6b7280; border: 1px solid #e5e7eb; }
  .crp-btn-icon:hover { background: #f3f4f6; color: #374151; }

  /* Section */
  .crp-section { background: #fff; border: 1px solid #e9eaed; border-radius: 12px; overflow: hidden; }
  .crp-section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid #f0f1f3;
  }
  .crp-section-title { font-size: 13px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px; }
  .crp-count { background: #f3f4f6; color: #6b7280; font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }

  /* Rule card */
  .crp-rules-list { display: flex; flex-direction: column; }
  .crp-rule-card {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f1f3;
    transition: background 0.1s;
    cursor: default;
  }
  .crp-rule-card:last-child { border-bottom: none; }
  .crp-rule-card:hover { background: #fafafa; }
  .crp-rule-card.crp-dragging { opacity: 0.4; }
  .crp-rule-card.crp-drag-over { background: #f0f0ff; border-color: #6366f1; }
  .crp-rule-card.crp-inactive { opacity: 0.5; }
  .crp-rule-card.crp-conflict { border-left: 3px solid #f59e0b; }

  .crp-drag-handle { color: #d1d5db; cursor: grab; flex-shrink: 0; }
  .crp-drag-handle:hover { color: #9ca3af; }

  .crp-rule-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .crp-rule-info { flex: 1; min-width: 0; }
  .crp-rule-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
  .crp-rule-name { font-size: 13px; font-weight: 600; color: #1a1d23; }
  .crp-rule-badges { display: flex; gap: 4px; }
  .crp-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.3px; text-transform: uppercase;
  }
  .crp-badge-required { background: #eff6ff; color: #3b82f6; }
  .crp-badge-inactive { background: #f3f4f6; color: #9ca3af; }
  .crp-badge-conflict { background: #fffbeb; color: #d97706; }

  .crp-rule-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #9ca3af; }
  .crp-rule-type { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
  .crp-rule-window { display: inline-flex; align-items: center; gap: 3px; }
  .crp-rule-desc { font-size: 11px; color: #9ca3af; margin: 4px 0 0; }

  .crp-rule-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  /* Toggle */
  .crp-toggle { position: relative; display: inline-block; width: 34px; height: 20px; cursor: pointer; flex-shrink: 0; }
  .crp-toggle input { opacity: 0; width: 0; height: 0; }
  .crp-toggle-track {
    position: absolute; inset: 0; background: #d1d5db; border-radius: 20px;
    transition: background 0.2s;
  }
  .crp-toggle-track::after {
    content: ""; position: absolute;
    width: 14px; height: 14px; left: 3px; top: 3px;
    background: #fff; border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px #0002;
  }
  .crp-toggle input:checked + .crp-toggle-track { background: #6366f1; }
  .crp-toggle input:checked + .crp-toggle-track::after { transform: translateX(14px); }

  .crp-icon-btn {
    width: 28px; height: 28px; border: none; cursor: pointer;
    background: #f3f4f6; color: #6b7280; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.12s;
  }
  .crp-icon-btn:hover { background: #e5e7eb; color: #374151; }
  .crp-icon-btn-danger:hover { background: #fee2e2; color: #ef4444; }

  /* Empty */
  .crp-empty {
    display: flex; flex-direction: column; align-items: center;
    padding: 48px 24px; gap: 8px; text-align: center;
  }
  .crp-empty-icon { color: #d1d5db; margin-bottom: 8px; }
  .crp-empty-title { font-size: 14px; font-weight: 600; color: #374151; margin: 0; }
  .crp-empty-text { font-size: 13px; color: #9ca3af; margin: 0 0 16px; }

  /* Loading */
  .crp-loading { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .crp-skeleton {
    height: 56px; background: linear-gradient(90deg, #f0f1f3 25%, #e5e7eb 50%, #f0f1f3 75%);
    background-size: 200% 100%;
    border-radius: 8px;
    animation: crpShimmer 1.4s infinite;
  }
  @keyframes crpShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Validation banner */
  .crp-banner {
    border-radius: 10px; overflow: hidden; border: 1px solid;
    font-size: 13px;
  }
  .crp-banner-ok { background: #f0fdf4; border-color: #bbf7d0; color: #166534; display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
  .crp-banner-warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
  .crp-banner-error { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }
  .crp-banner-toggle {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    cursor: pointer; width: 100%; background: none; border: none; color: inherit; font-size: 13px; font-weight: 500;
  }
  .crp-banner-toggle:hover { opacity: 0.85; }
  .crp-chevron { margin-left: auto; transition: transform 0.2s; }
  .crp-chevron-up { transform: rotate(180deg); }
  .crp-banner-body { padding: 0 14px 12px; display: flex; flex-direction: column; gap: 6px; }
  .crp-banner-item { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; padding: 4px 0; }
  .crp-banner-item svg { flex-shrink: 0; margin-top: 1px; }
  .crp-banner-item-error { color: #be123c; }
  .crp-banner-item-warn { color: #b45309; }
  .crp-banner-item-warning { color: #b45309; }

  /* Timeline */
  .crp-timeline-section { background: #fff; border: 1px solid #e9eaed; border-radius: 12px; overflow: hidden; }
  .crp-timeline-wrap {
    padding: 16px; display: flex; align-items: center; gap: 10px;
  }
  .crp-timeline-label { font-size: 11px; color: #9ca3af; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .crp-timeline-track {
    flex: 1; height: 48px; background: #f3f4f6; border-radius: 8px;
    position: relative; overflow: visible;
  }
  .crp-timeline-bar {
    position: absolute; top: 6px; height: 36px;
    border: 1.5px solid; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; min-width: 2px;
  }
  .crp-timeline-bar-label { font-size: 10px; font-weight: 600; white-space: nowrap; padding: 0 6px; overflow: hidden; text-overflow: ellipsis; }
  .crp-timeline-event {
    position: absolute; top: -4px; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center;
  }
  .crp-timeline-event-line { width: 2px; height: 56px; background: #374151; }
  .crp-timeline-event-label { font-size: 10px; font-weight: 600; color: #374151; white-space: nowrap; margin-top: 2px; }

  /* Modal */
  .crp-modal-overlay {
    position: fixed; inset: 0; background: #0006; z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .crp-modal {
    background: #fff; border-radius: 14px; width: 100%; max-width: 480px;
    max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px #0003;
    animation: crpModalIn 0.18s ease;
  }
  .crp-modal-wide { max-width: 640px; }
  @keyframes crpModalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: none; } }
  .crp-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid #f0f1f3;
  }
  .crp-modal-title { font-size: 15px; font-weight: 650; letter-spacing: -0.3px; margin: 0; }
  .crp-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .crp-modal-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 14px 20px; border-top: 1px solid #f0f1f3;
  }
  .crp-modal-desc { font-size: 13px; color: #6b7280; margin: 0; }

  /* Form */
  .crp-form-field { display: flex; flex-direction: column; gap: 6px; }
  .crp-form-label { font-size: 12px; font-weight: 600; color: #374151; }
  .crp-optional { font-weight: 400; color: #9ca3af; }
  .crp-form-input {
    border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 11px;
    font-size: 13px; color: #1a1d23; outline: none; transition: border-color 0.15s;
    font-family: inherit;
  }
  .crp-form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px #6366f120; }
  .crp-form-textarea { resize: vertical; min-height: 72px; }
  .crp-form-hint { font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.5; }
  .crp-form-error {
    display: flex; align-items: center; gap: 6px;
    background: #fff1f2; border: 1px solid #fecdd3; color: #be123c;
    padding: 8px 12px; border-radius: 8px; font-size: 12px;
  }

  /* Type grid */
  .crp-type-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px;
  }
  .crp-type-option {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 500;
    background: #f9fafb; border: 1.5px solid #e5e7eb; cursor: pointer;
    transition: all 0.12s; color: #374151;
  }
  .crp-type-option:hover { background: #f3f4f6; border-color: #d1d5db; }
  .crp-type-selected { font-weight: 600; }

  /* Window row */
  .crp-window-row { display: flex; align-items: center; gap: 10px; }
  .crp-window-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .crp-window-label { font-size: 11px; color: #9ca3af; }
  .crp-window-divider { font-size: 16px; color: #d1d5db; margin-top: 18px; }

  /* Flags */
  .crp-form-flags { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #f9fafb; border-radius: 10px; }
  .crp-checkbox-row {
    display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
    font-size: 12px; color: #374151; line-height: 1.5;
  }
  .crp-checkbox-row input { margin-top: 2px; accent-color: #6366f1; flex-shrink: 0; }

  /* Scenarios */
  .crp-scenarios-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin-top: 12px; }
  .crp-scenario-card {
    display: flex; flex-direction: column; gap: 4px; text-align: left;
    padding: 14px; border-radius: 10px; border: 1.5px solid #e5e7eb;
    background: #fff; cursor: pointer; transition: all 0.15s;
  }
  .crp-scenario-card:hover { border-color: #6366f1; background: #f8f8ff; }
  .crp-scenario-name { font-size: 13px; font-weight: 600; color: #1a1d23; }
  .crp-scenario-desc { font-size: 11px; color: #6b7280; line-height: 1.4; }
  .crp-scenario-rules { font-size: 11px; font-weight: 600; color: #6366f1; margin-top: 6px; }

  @media (max-width: 600px) {
    .crp-header { padding: 14px 16px; flex-wrap: wrap; gap: 10px; }
    .crp-body { padding: 14px 16px; }
    .crp-rule-card { flex-wrap: wrap; }
    .crp-type-grid { grid-template-columns: repeat(2, 1fr); }
    .crp-window-row { flex-direction: column; }
    .crp-window-divider { display: none; }
  }
`;