"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  FileText,
  Mail,
  List,
  UserCheck,
  ChevronDown,
  X,
  AlertCircle,
  Info,
  Shield,
  Zap,
} from "lucide-react";
import {
  CheckinRule,
  CheckinRuleType,
  CheckinRulesValidation,
  CHECKIN_SCENARIOS,
  CheckinScenario,
} from "@/src/models/CheckinRule";

// import  "./CheckinRulesPage.module.css";

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
const RULE_TYPE_META: Record<
  CheckinRuleType,
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  qr_code: {
    label: "QR Code",
    icon: <QrCode size={14} />,
    color: "#6366f1",
    description: "Leitura de QR Code único por participante",
  },
  document: {
    label: "Documento",
    icon: <FileText size={14} />,
    color: "#0ea5e9",
    description: "Verificação de documento com foto",
  },
  printed_list: {
    label: "Lista Impressa",
    icon: <List size={14} />,
    color: "#8b5cf6",
    description: "Conferência em lista física impressa",
  },
  email_confirmation: {
    label: "Confirmação Email",
    icon: <Mail size={14} />,
    color: "#f59e0b",
    description: "Link de confirmação enviado por email",
  },
  manual_verification: {
    label: "Verificação Manual",
    icon: <UserCheck size={14} />,
    color: "#10b981",
    description: "Operador confirma presença manualmente",
  },
};

const EMPTY_RULE: Omit<
  CheckinRule,
  "id" | "eventId" | "createdAt" | "updatedAt"
> = {
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
    warnings.push(
      "Nenhuma regra obrigatória ativa — o check-in será opcional.",
    );

  // Verifica duplicidade de tipo entre obrigatórias
  const seenTypes = new Map<CheckinRuleType, CheckinRule>();
  for (const r of activeRequired) {
    if (seenTypes.has(r.type)) {
      const prev = seenTypes.get(r.type)!;
      conflicts.push({
        ruleId1: prev.id,
        ruleId2: r.id,
        ruleName1: prev.name,
        ruleName2: r.name,
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
      errors.push(
        `"${r.name}": janela de validação zerada — ninguém conseguirá fazer check-in.`,
      );
    }
    if (r.timeWindow.before + r.timeWindow.after < 5) {
      warnings.push(
        `"${r.name}": janela muito curta (${r.timeWindow.before + r.timeWindow.after} min total). Considere ampliar.`,
      );
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
      const aEnd = a.timeWindow.after;
      const bStart = -b.timeWindow.before;
      const bEnd = b.timeWindow.after;
      const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
      if (overlap <= 0) {
        conflicts.push({
          ruleId1: a.id,
          ruleId2: b.id,
          ruleName1: a.name,
          ruleName2: b.name,
          reason: `Janelas sem sobreposição: "${a.name}" e "${b.name}" nunca estarão abertas ao mesmo tempo.`,
          severity: "error",
        });
      }
    }
  }

  return {
    isValid:
      errors.length === 0 &&
      conflicts.filter((c) => c.severity === "error").length === 0,
    errors,
    warnings,
    conflicts,
  };
}

/* ─── Main Component ─────────────────────────────────────── */
export function CheckinRulesPage({
  eventId,
  eventName = "Evento",
  onClose,
}: CheckinRulesPageProps) {
  const [rules, setRules] = useState<CheckinRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<CheckinRulesValidation | null>(
    null,
  );
  const [editingRule, setEditingRule] = useState<CheckinRule | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [drag, setDrag] = useState<DragState>({
    draggingId: null,
    overId: null,
  });
  const dragCounter = useRef(0);

  // ── Load ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/eventos/${eventId}/regras-checkin`);
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null); // novo estado
    try {
      const res = await fetch(`/api/eventos/${eventId}/regras-checkin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.message ?? "Erro ao salvar regras.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [eventId, rules]);

  // ── CRUD ──
  function addRule(
    rule: Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt">,
  ) {
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
    setRules((prev) =>
      prev.map((r) =>
        r.id === updated.id
          ? { ...updated, updatedAt: new Date().toISOString() }
          : r,
      ),
    );
    setEditingRule(null);
  }

  function deleteRule(id: string) {
    setRules((prev) =>
      prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i })),
    );
  }

  function toggleActive(id: string) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, isActive: !r.isActive, updatedAt: new Date().toISOString() }
          : r,
      ),
    );
  }

  function applyScenario(scenario: CheckinScenario) {
    const now = new Date().toISOString();
    const newRules: CheckinRule[] = scenario.rules.map((r, i) => ({
      ...r,
      id: uid(),
      eventId,
      order: i,
      createdAt: now,
      updatedAt: now,
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
      const to = arr.findIndex((r) => r.id === targetId);
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
          <div className="crp-icon-wrap">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="crp-title">Regras de Check-in</h2>
            <p className="crp-subtitle">{eventName}</p>
          </div>
        </div>
        <div className="crp-header-right">
          <button
            className="crp-btn crp-btn-ghost"
            onClick={() => setShowScenarios(true)}
          >
            <Zap size={14} /> Cenários
          </button>
          <button
            className="crp-btn crp-btn-primary"
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saved ? (
              <>
                <CheckCircle2 size={14} /> Salvo!
              </>
            ) : saving ? (
              "Salvando…"
            ) : (
              "Salvar regras"
            )}
          </button>
          {onClose && (
            <button className="crp-btn crp-btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="crp-body">
        {/* Validation banner */}
        {validation && <ValidationBanner validation={validation} />}

        {saveError && (
          <div className="crp-banner crp-banner-error">
            <AlertCircle size={15} /> {saveError}
          </div>
        )}

        {/* Rules list */}
        <div className="crp-section">
          <div className="crp-section-header">
            <span className="crp-section-title">
              Regras configuradas
              <span className="crp-count">
                {rules.filter((r) => r.isActive).length}/{rules.length} ativas
              </span>
            </span>
            <button
              className="crp-btn crp-btn-secondary"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus size={14} /> Adicionar regra
            </button>
          </div>

          {loading ? (
            <div className="crp-loading">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="crp-skeleton"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="crp-empty">
              <Shield size={36} className="crp-empty-icon" />
              <p className="crp-empty-title">Nenhuma regra configurada</p>
              <p className="crp-empty-text">
                Adicione regras ou escolha um cenário pronto para começar.
              </p>
              <button
                className="crp-btn crp-btn-primary"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus size={14} /> Primeira regra
              </button>
            </div>
          ) : (
            <div className="crp-rules-list">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  conflictIds={
                    validation?.conflicts
                      .map((c) => [c.ruleId1, c.ruleId2])
                      .flat() ?? []
                  }
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
        {rules.length > 0 && <TimelinePreview rules={rules} />}
      </div>

      {/* Modals */}
      {(isAddingNew || editingRule) && (
        <RuleFormModal
          rule={editingRule}
          onSave={(data) =>
            editingRule
              ? updateRule({ ...editingRule, ...data })
              : addRule(data)
          }
          onClose={() => {
            setIsAddingNew(false);
            setEditingRule(null);
          }}
        />
      )}

      {showScenarios && (
        <ScenariosModal
          onApply={applyScenario}
          onClose={() => setShowScenarios(false)}
        />
      )}
    </div>
  );
}

/* ─── RuleCard ───────────────────────────────────────────── */
function RuleCard({
  rule,
  conflictIds,
  isDragging,
  isOver,
  onEdit,
  onDelete,
  onToggle,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
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
      <div className="crp-drag-handle">
        <GripVertical size={14} />
      </div>

      {/* Type icon */}
      <div
        className="crp-rule-icon"
        style={{ color: meta.color, background: `${meta.color}18` }}
      >
        {meta.icon}
      </div>

      {/* Info */}
      <div className="crp-rule-info">
        <div className="crp-rule-name-row">
          <span className="crp-rule-name">{rule.name || meta.label}</span>
          <div className="crp-rule-badges">
            {rule.isRequired && (
              <span className="crp-badge crp-badge-required">obrigatório</span>
            )}
            {!rule.isActive && (
              <span className="crp-badge crp-badge-inactive">inativo</span>
            )}
            {hasConflict && (
              <span className="crp-badge crp-badge-conflict">
                <AlertTriangle size={10} /> conflito
              </span>
            )}
          </div>
        </div>
        <div className="crp-rule-meta">
          <span className="crp-rule-type" style={{ color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          <span className="crp-rule-window">
            <Clock size={11} />{" "}
            {formatWindow(rule.timeWindow.before, rule.timeWindow.after)}
          </span>
        </div>
        {rule.description && (
          <p className="crp-rule-desc">{rule.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="crp-rule-actions">
        <label
          className="crp-toggle"
          title={rule.isActive ? "Desativar" : "Ativar"}
        >
          <input type="checkbox" checked={rule.isActive} onChange={onToggle} />
          <span className="crp-toggle-track" />
        </label>
        <button className="crp-icon-btn" onClick={onEdit} title="Editar">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="crp-icon-btn crp-icon-btn-danger"
          onClick={onDelete}
          title="Remover"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Timeline Preview ────────────────────────────────────── */
function TimelinePreview({ rules }: { rules: CheckinRule[] }) {
  const active = rules.filter((r) => r.isActive);
  if (active.length === 0) return null;

  const maxBefore = Math.max(...active.map((r) => r.timeWindow.before), 0);
  const maxAfter = Math.max(...active.map((r) => r.timeWindow.after), 0);
  const total = maxBefore + maxAfter || 1;

  return (
    <div className="crp-timeline-section">
      <div className="crp-section-header">
        <span className="crp-section-title">
          Visualização da janela de check-in
        </span>
      </div>
      <div className="crp-timeline-wrap">
        <span className="crp-timeline-label crp-timeline-label-left">
          −{maxBefore}min
        </span>
        <div className="crp-timeline-track">
          {active.map((rule) => {
            const meta = RULE_TYPE_META[rule.type];
            const left = ((maxBefore - rule.timeWindow.before) / total) * 100;
            const width =
              ((rule.timeWindow.before + rule.timeWindow.after) / total) * 100;
            return (
              <div
                key={rule.id}
                className="crp-timeline-bar"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: `${meta.color}30`,
                  borderColor: meta.color,
                }}
                title={`${rule.name}: ${formatWindow(rule.timeWindow.before, rule.timeWindow.after)}`}
              >
                <span
                  className="crp-timeline-bar-label"
                  style={{ color: meta.color }}
                >
                  {rule.name}
                </span>
              </div>
            );
          })}
          {/* Event marker */}
          <div
            className="crp-timeline-event"
            style={{ left: `${(maxBefore / total) * 100}%` }}
          >
            <div className="crp-timeline-event-line" />
            <span className="crp-timeline-event-label">Evento</span>
          </div>
        </div>
        <span className="crp-timeline-label crp-timeline-label-right">
          +{maxAfter}min
        </span>
      </div>
    </div>
  );
}

/* ─── Validation Banner ───────────────────────────────────── */
function ValidationBanner({
  validation,
}: {
  validation: CheckinRulesValidation;
}) {
  const [expanded, setExpanded] = useState(true);
  const total =
    validation.errors.length +
    validation.warnings.length +
    validation.conflicts.length;
  if (total === 0 && validation.isValid)
    return (
      <div className="crp-banner crp-banner-ok">
        <CheckCircle2 size={15} /> Configuração válida — sem conflitos
        detectados.
      </div>
    );

  return (
    <div
      className={`crp-banner crp-banner-${validation.isValid ? "warn" : "error"}`}
    >
      <button
        className="crp-banner-toggle"
        onClick={() => setExpanded((e) => !e)}
      >
        <AlertTriangle size={15} />
        <span>
          {!validation.isValid ? "Configuração inválida" : "Atenção"} —{" "}
          {validation.errors.length > 0 &&
            `${validation.errors.length} erro(s)`}
          {validation.warnings.length > 0 &&
            ` ${validation.warnings.length} aviso(s)`}
          {validation.conflicts.length > 0 &&
            ` ${validation.conflicts.length} conflito(s)`}
        </span>
        <ChevronDown
          size={14}
          className={`crp-chevron ${expanded ? "crp-chevron-up" : ""}`}
        />
      </button>
      {expanded && (
        <div className="crp-banner-body">
          {validation.errors.map((e, i) => (
            <div key={i} className="crp-banner-item crp-banner-item-error">
              <AlertCircle size={13} /> {e}
            </div>
          ))}
          {validation.conflicts.map((c, i) => (
            <div
              key={i}
              className={`crp-banner-item crp-banner-item-${c.severity}`}
            >
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
  rule,
  onSave,
  onClose,
}: {
  rule: CheckinRule | null;
  onSave: (
    data: Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt">,
  ) => void;
  onClose: () => void;
}) {
  const isEdit = !!rule;
  const [form, setForm] = useState<
    Omit<CheckinRule, "id" | "eventId" | "createdAt" | "updatedAt">
  >(
    rule
      ? {
          name: rule.name,
          type: rule.type,
          description: rule.description ?? "",
          isActive: rule.isActive,
          isRequired: rule.isRequired,
          timeWindow: { ...rule.timeWindow },
          order: rule.order,
        }
      : { ...EMPTY_RULE },
  );
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Nome da regra é obrigatório.");
      return;
    }
    if (form.timeWindow.before < 0 || form.timeWindow.after < 0) {
      setError("Valores de janela devem ser ≥ 0.");
      return;
    }
    onSave(form);
  }

  const meta = RULE_TYPE_META[form.type];

  return (
    <div
      className="crp-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="crp-modal">
        <div className="crp-modal-header">
          <h3 className="crp-modal-title">
            {isEdit ? "Editar regra" : "Nova regra de check-in"}
          </h3>
          <button className="crp-btn crp-btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="crp-modal-body">
          {error && (
            <div className="crp-form-error">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Type selector */}
          <div className="crp-form-field">
            <label className="crp-form-label">Tipo de verificação</label>
            <div className="crp-type-grid">
              {(
                Object.entries(RULE_TYPE_META) as [
                  CheckinRuleType,
                  (typeof RULE_TYPE_META)[CheckinRuleType],
                ][]
              ).map(([type, m]) => (
                <button
                  key={type}
                  className={`crp-type-option ${form.type === type ? "crp-type-selected" : ""}`}
                  onClick={() =>
                    setForm((f) => ({ ...f, type, name: f.name || m.label }))
                  }
                  style={
                    form.type === type
                      ? { borderColor: m.color, background: `${m.color}12` }
                      : undefined
                  }
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
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setError("");
              }}
            />
          </div>

          {/* Description */}
          <div className="crp-form-field">
            <label className="crp-form-label">
              Descrição <span className="crp-optional">(opcional)</span>
            </label>
            <textarea
              className="crp-form-input crp-form-textarea"
              value={form.description}
              placeholder="Instrução exibida ao operador no momento do check-in…"
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Time window */}
          <div className="crp-form-field">
            <label className="crp-form-label">Janela de check-in</label>
            <div className="crp-window-row">
              <div className="crp-window-field">
                <label className="crp-window-label">
                  Antes do evento (min)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  className="crp-form-input"
                  value={form.timeWindow.before}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timeWindow: {
                        ...f.timeWindow,
                        before: Math.max(0, +e.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div className="crp-window-divider">→</div>
              <div className="crp-window-field">
                <label className="crp-window-label">
                  Depois do evento (min)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  className="crp-form-input"
                  value={form.timeWindow.after}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timeWindow: {
                        ...f.timeWindow,
                        after: Math.max(0, +e.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
            <p className="crp-form-hint">
              O check-in ficará disponível de{" "}
              <strong>{form.timeWindow.before}min antes</strong> até{" "}
              <strong>{form.timeWindow.after}min depois</strong> do horário do
              evento.
            </p>
          </div>

          {/* Flags */}
          <div className="crp-form-flags">
            <label className="crp-checkbox-row">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isRequired: e.target.checked }))
                }
              />
              <span>
                <strong>Obrigatório</strong> — participante deve cumprir esta
                regra para concluir o check-in
              </span>
            </label>
            <label className="crp-checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              <span>
                <strong>Ativo</strong> — regra está habilitada para este evento
              </span>
            </label>
          </div>
        </div>
        <div className="crp-modal-footer">
          <button className="crp-btn crp-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="crp-btn crp-btn-primary" onClick={handleSubmit}>
            {isEdit ? "Salvar alterações" : "Adicionar regra"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Scenarios Modal ─────────────────────────────────────── */
function ScenariosModal({
  onApply,
  onClose,
}: {
  onApply: (s: CheckinScenario) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="crp-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="crp-modal crp-modal-wide">
        <div className="crp-modal-header">
          <h3 className="crp-modal-title">Cenários prontos</h3>
          <button className="crp-btn crp-btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="crp-modal-body">
          <p className="crp-modal-desc">
            Escolha um cenário para pré-configurar as regras. As regras atuais
            serão substituídas.
          </p>
          <div className="crp-scenarios-grid">
            {CHECKIN_SCENARIOS.map((s) => (
              <button
                key={s.name}
                className="crp-scenario-card"
                onClick={() => onApply(s)}
              >
                <span className="crp-scenario-name">{s.name}</span>
                <span className="crp-scenario-desc">{s.description}</span>
                <span className="crp-scenario-rules">
                  {s.rules.length} regra{s.rules.length !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
