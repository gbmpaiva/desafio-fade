
export type CheckinRuleType = 
  | 'qr_code' 
  | 'document' 
  | 'printed_list' 
  | 'email_confirmation' 
  | 'manual_verification';

export type CheckinStatus = 'pending' | 'open' | 'expired' | 'blocked' | 'closed';



export interface TimeWindow {
  before: number; // minutos antes do evento
  after: number;  // minutos depois do evento
}


export interface CheckinRule {
  id: string;
  eventId: string;
  name: string;
  type: CheckinRuleType;
  description?: string;
  isActive: boolean;
  isRequired: boolean;
  timeWindow: TimeWindow;
  order: number;
  createdAt: string;
  updatedAt: string;
}


export interface CheckinValidationResult {
  isValid: boolean;
  status: CheckinStatus;
  minutesBefore: number;
  minutesAfter: number;
  allowCheckin: boolean;
  message: string;
  reason?: 'TOO_EARLY' | 'EXPIRED' | 'VALID';
}



export interface CheckinRuleConflict {
  ruleId1: string;
  ruleId2: string;
  ruleName1: string;
  ruleName2: string;
  reason: string;
  severity: 'warning' | 'error';
}



export interface CheckinRulesValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: CheckinRuleConflict[];
}



export interface CheckinParticipant {
  participantId: string;
  participantName: string;
  eventId: string;
  rulesCompleted: string[];
  pendingRules: string[];
  isComplete: boolean;
  checkedInAt?: string;
}



export const CHECKIN_RULE_TEMPLATES: Record<string, Omit<CheckinRule, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>> = {
  conference_qr_code: {
    name: 'QR Code de Acesso',
    type: 'qr_code',
    description: 'Escaneie o QR Code recebido por email',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 15, after: 30 },
    order: 0,
  },

  conference_document: {
    name: 'Verificação de Documento',
    type: 'document',
    description: 'Apresente um documento com foto',
    isActive: true,
    isRequired: false,
    timeWindow: { before: 15, after: 30 },
    order: 1,
  },

  workshop_email: {
    name: 'Confirmação por Email',
    type: 'email_confirmation',
    description: 'Confirme presença clicando no link',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 30, after: 0 },
    order: 0,
  },

  webinar_qr: {
    name: 'QR Code Simplificado',
    type: 'qr_code',
    description: 'Apresente seu código de inscrição',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 10, after: 60 },
    order: 0,
  },

  webinar_manual: {
    name: 'Verificação Manual',
    type: 'manual_verification',
    description: 'Moderador marca presença',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 10, after: 120 },
    order: 1,
  },

  party_entry: {
    name: 'Pulseira de Acesso',
    type: 'qr_code',
    description: 'Mostre a pulseira recebida',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 30, after: 600 },
    order: 0,
  },

  interview_id: {
    name: 'Verificação de Identidade',
    type: 'document',
    description: 'Apresente documento original',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 5, after: 30 },
    order: 0,
  },

  seminar_qr: {
    name: 'QR Code Rigoroso',
    type: 'qr_code',
    description: 'Check-in com janela apertada',
    isActive: true,
    isRequired: true,
    timeWindow: { before: 10, after: 20 },
    order: 0,
  },
};


export interface CheckinScenario {
  name: string;
  description: string;
  eventType: 'conference' | 'workshop' | 'webinar' | 'party' | 'course' | 'interview' | 'seminar' | 'networking';
  rules: Omit<CheckinRule, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>[];
}

export const CHECKIN_SCENARIOS: CheckinScenario[] = [
  {
    name: 'Conferência Corporativa',
    description: 'Evento formal, 15min antes até 30min depois',
    eventType: 'conference',
    rules: [
      CHECKIN_RULE_TEMPLATES.conference_qr_code,
      CHECKIN_RULE_TEMPLATES.conference_document,
    ],
  },
  {
    name: 'Workshop / Capacitação',
    description: 'Confirmação antecipada, 30min antes',
    eventType: 'workshop',
    rules: [CHECKIN_RULE_TEMPLATES.workshop_email],
  },
  {
    name: 'Webinar / Live',
    description: 'Flexível, 10min antes até 1h depois',
    eventType: 'webinar',
    rules: [
      CHECKIN_RULE_TEMPLATES.webinar_qr,
      CHECKIN_RULE_TEMPLATES.webinar_manual,
    ],
  },
  {
    name: 'Festa / Balada',
    description: 'Muito flexível, 30min antes até 10h depois',
    eventType: 'party',
    rules: [CHECKIN_RULE_TEMPLATES.party_entry],
  },
  {
    name: 'Entrevista',
    description: 'Muito rigoroso, 5min antes até 30min depois',
    eventType: 'interview',
    rules: [CHECKIN_RULE_TEMPLATES.interview_id],
  },
  {
    name: 'Seminário',
    description: 'Janela apertada, 10min antes até 20min depois',
    eventType: 'seminar',
    rules: [CHECKIN_RULE_TEMPLATES.seminar_qr],
  },
];