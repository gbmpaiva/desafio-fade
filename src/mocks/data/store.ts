
import { Event } from '../../models/Event';
import { Participant } from '../../models/Participant';
import { User } from '../../models/User';   



export const MOCK_USERS: Array<User & { password: string }> = [
  {
    id: "1",
    name: "Gabriel Paiva",
    email: "gabriel@fade.com",
    password: "gabriel12",
  },
  {
    id: "2",
    name: "Staff",
    email: "staff@demo.com",
    password: "staff123",
  },
];

// ─── Eventos ──────────────────────────────────────────────────────────────────

export const event: Event[] = [
  {
    id: "1",
    name: "Tech Summit 2025",
    description: "Conferência anual de tecnologia com palestras e workshops.",
    date: "2025-08-15T09:00:00",
    location: "Centro de Convenções SP",
    capacity: 500,
    participantCount: 342,
    status: "active",
    createdAt: "2025-01-10T08:00:00",
    updatedAt: "2025-03-01T10:00:00",
    // checkinRules: {
    //   eventoId: "1",
    //   antecedenciaMinutos: 30,
    //   exigirDocumento: true,
    //   permitirMultiploCheckin: false,
    //   observacoes: "Documento com foto obrigatório.",
    // },
  },
  {
    id: "2",
    name: "Workshop React Avançado",
    description: "Workshop prático sobre React, Next.js e performance.",
    date: "2025-07-20T14:00:00",
    location: "Sala 204 - Edifício Alpha",
    capacity: 40,
    participantCount: 38,
    status: 'active',
    createdAt: "2025-02-01T08:00:00",
    updatedAt: "2025-03-10T10:00:00",
  },
  {
    id: "3",
    name: "Hackathon IA 2024",
    description: "Maratona de desenvolvimento com foco em Inteligência Artificial.",
    date: "2024-11-10T08:00:00",
    location: "Campus Universitário Norte",
    capacity: 200,
    participantCount: 187,
    status: "closed",
    createdAt: "2024-09-01T08:00:00",
    updatedAt: "2024-12-01T10:00:00",   
  },
  {
    id: "4",
    name: "UX Design Summit",
    description: "Encontro de designers e pesquisadores de UX.",
    date: "2025-09-05T10:00:00",
    location: "Auditório Central - RJ",
    capacity: 150,
    participantCount: 60,
    status: "active",
    createdAt: "2025-03-05T08:00:00",
    updatedAt: "2025-03-05T08:00:00",
  },
];

export const participant: Participant[] = [
  {
    id: "1",
    name: "Ana Paula Silva",
    email: "ana@email.com",
    phone: "(11) 99999-1111",
    eventId: "1",
    eventName: "Tech Summit 2025",
    checkedIn: true,
    createdAt: "2025-06-01T10:00:00",
  },
  {
    id: "2",
    name: "Carlos Eduardo Souza",
    email: "carlos@email.com",
    phone: "(11) 99999-2222",
    eventId: "1",
    eventName: "Tech Summit 2025",
    checkedIn: false,
    createdAt: "2025-06-02T11:30:00",
  },
  {
    id: "3",
    name: "Mariana Costa",
    email: "mariana@email.com",
    phone: "(21) 99999-3333",
    eventId: "2",
    eventName: "Workshop React Avançado",
    checkedIn: true,
    createdAt: "2025-06-05T09:15:00",
  },
  {
    id: "4",
    name: "Pedro Henrique Lima",
    email: "pedro@email.com",
    phone: "(31) 99999-4444",
    eventId: "2",
    eventName: "Workshop React Avançado",
    checkedIn: false,
    createdAt: "2025-06-06T14:20:00",
  },
  {
    id: "5",
    name: "Juliana Ferreira",
    email: "juliana@email.com",
    phone: "(41) 99999-5555",
    eventId: "4",
    eventName: "UX Design Summit",
    checkedIn: false,
    createdAt: "2025-06-10T08:00:00",
  },
];

// ─── ID counters ──────────────────────────────────────────────────────────────

export const counters = { evento: 10, participante: 10 };

export function nextEventoId() {
  return String(counters.evento++);
}

export function nextParticipanteId() {
  return String(counters.participante++);
}
