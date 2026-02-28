import { User} from '../models/user'
import { Event } from '../models/Event'
import { Participant } from '../models/Participant'
import { CheckinRule } from '../models/CheckinRule'

// ─── Users ────────────────────────────────────────────────────────────────────
export const mockUsers: (User & { password: string })[] = [
  { id: 'user-1', name: 'Ana Rodrigues', email: 'ana@eventpanel.com', password: 'senha123' },
  { id: 'user-2', name: 'Carlos Mendes', email: 'carlos@eventpanel.com', password: 'senha123' },
]

// ─── Events ───────────────────────────────────────────────────────────────────
export const mockEvents: Event[] = [
  {
    id: 'evt-1', name: 'Summit de Tecnologia 2025',
    date: '2025-06-15T09:00:00.000Z', location: 'Centro de Convenções SP',
    status: 'active', capacity: 500, participantCount: 342,
    description: 'O maior summit de tecnologia do Brasil.',
    createdAt: '2025-01-10T08:00:00.000Z', updatedAt: '2025-03-01T10:00:00.000Z',
  },
  {
    id: 'evt-2', name: 'Workshop React Avançado',
    date: '2025-04-20T14:00:00.000Z', location: 'Espaço Coworking Alpha – RJ',
    status: 'active', capacity: 80, participantCount: 78,
    description: 'Workshop intensivo de React com foco em performance.',
    createdAt: '2025-02-01T08:00:00.000Z', updatedAt: '2025-03-10T10:00:00.000Z',
  },
  {
    id: 'evt-3', name: 'Hackathon FinTech 2024',
    date: '2024-11-30T08:00:00.000Z', location: 'Hub de Inovação – BH',
    status: 'closed', capacity: 200, participantCount: 198,
    description: 'Maratona de inovação no setor financeiro.',
    createdAt: '2024-09-01T08:00:00.000Z', updatedAt: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 'evt-4', name: 'Conferência UX & Design',
    date: '2025-07-10T09:00:00.000Z', location: 'Teatro Municipal – Curitiba',
    status: 'draft', capacity: 300, participantCount: 0,
    description: 'Conferência sobre UX Research e Product Design.',
    createdAt: '2025-03-05T08:00:00.000Z', updatedAt: '2025-03-05T08:00:00.000Z',
  },
  {
    id: 'evt-5', name: 'DevOps Day 2025',
    date: '2025-05-22T09:00:00.000Z', location: 'Hotel Grand Hyatt – SP',
    status: 'active', capacity: 150, participantCount: 87,
    description: 'Práticas modernas de DevOps e plataforma de engenharia.',
    createdAt: '2025-02-20T08:00:00.000Z', updatedAt: '2025-03-12T10:00:00.000Z',
  },
]

// ─── Participants ─────────────────────────────────────────────────────────────
export const mockParticipants: Participant[] = [
  { id: 'p-1', name: 'Beatriz Lima', email: 'beatriz@email.com', eventId: 'evt-1', eventName: 'Summit de Tecnologia 2025', checkedIn: true, checkedInAt: '2025-06-15T09:12:00.000Z', phone: '(11) 98765-4321', createdAt: '2025-02-01T08:00:00.000Z' },
  { id: 'p-2', name: 'Rafael Costa', email: 'rafael@email.com', eventId: 'evt-1', eventName: 'Summit de Tecnologia 2025', checkedIn: false, phone: '(11) 91234-5678', createdAt: '2025-02-05T08:00:00.000Z' },
  { id: 'p-3', name: 'Juliana Ferreira', email: 'juliana@email.com', eventId: 'evt-2', eventName: 'Workshop React Avançado', checkedIn: true, checkedInAt: '2025-04-20T14:05:00.000Z', createdAt: '2025-03-01T08:00:00.000Z' },
  { id: 'p-4', name: 'Marcos Oliveira', email: 'marcos@email.com', eventId: 'evt-2', eventName: 'Workshop React Avançado', checkedIn: false, phone: '(21) 99876-5432', createdAt: '2025-03-10T08:00:00.000Z' },
  { id: 'p-5', name: 'Fernanda Souza', email: 'fernanda@email.com', eventId: 'evt-1', eventName: 'Summit de Tecnologia 2025', checkedIn: true, checkedInAt: '2025-06-15T09:30:00.000Z', createdAt: '2025-02-15T08:00:00.000Z' },
  { id: 'p-6', name: 'Lucas Almeida', email: 'lucas@email.com', eventId: 'evt-5', eventName: 'DevOps Day 2025', checkedIn: false, phone: '(31) 98888-7777', createdAt: '2025-03-01T08:00:00.000Z' },
  { id: 'p-7', name: 'Amanda Nunes', email: 'amanda@email.com', eventId: 'evt-3', eventName: 'Hackathon FinTech 2024', checkedIn: true, checkedInAt: '2024-11-30T08:15:00.000Z', createdAt: '2024-10-01T08:00:00.000Z' },
  { id: 'p-8', name: 'Pedro Rocha', email: 'pedro@email.com', eventId: 'evt-1', eventName: 'Summit de Tecnologia 2025', checkedIn: false, phone: '(11) 97777-6666', createdAt: '2025-01-20T08:00:00.000Z' },
]

// ─── Checkin Rules ────────────────────────────────────────────────────────────
export const mockCheckinRules: CheckinRule[] = [
  { id: 'rule-1', eventId: 'evt-1', name: 'QR Code', type: 'qr_code', isActive: true, isRequired: true, windowBefore: 30, windowAfter: 60, order: 1, createdAt: '2025-01-10T08:00:00.000Z', updatedAt: '2025-01-10T08:00:00.000Z' },
  { id: 'rule-2', eventId: 'evt-1', name: 'Documento de Identidade', type: 'document', isActive: true, isRequired: false, windowBefore: 60, windowAfter: 30, order: 2, createdAt: '2025-01-10T08:00:00.000Z', updatedAt: '2025-01-10T08:00:00.000Z' },
  { id: 'rule-3', eventId: 'evt-1', name: 'Confirmação por E-mail', type: 'email_confirmation', isActive: false, isRequired: false, windowBefore: 120, windowAfter: 0, order: 3, createdAt: '2025-01-10T08:00:00.000Z', updatedAt: '2025-02-15T10:00:00.000Z' },
  { id: 'rule-4', eventId: 'evt-2', name: 'Lista Impressa', type: 'printed_list', isActive: true, isRequired: true, windowBefore: 15, windowAfter: 45, order: 1, createdAt: '2025-02-01T08:00:00.000Z', updatedAt: '2025-02-01T08:00:00.000Z' },
]

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
