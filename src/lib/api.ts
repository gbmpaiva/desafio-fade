import { http } from "./http";
import { LoginCredentials } from "../models/LoginCredentials";
import { AuthResponse } from "../models/AuthResponse";
import { DashboardStats } from "../models/Dashboard";
import { CheckinRule } from "../models/CheckinRule";
import { Event, EventFormData } from "../models/Event";
import { Participant, ParticipantFormData } from "../models/Participant";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function login(credentials: LoginCredentials) {
  return http.post<AuthResponse>("/auth/login", credentials);
}

export async function getMe() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json(); // { user: User }
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
// ─── Dashboard ────────────────────────────────────────────────────────────────

export function getDashboardStats() {
  return http.get<DashboardStats>("/dashboard");
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export function getEvents() {
  return http.get<Event[]>("/eventos");
}

export function getEvent(id: string) {
  return http.get<Event>(`/eventos/${id}`);
}

export function createEvent(data: EventFormData) {
  return http.post<Event>("/eventos", data);
}

export function updateEvent(id: string, data: Partial<EventFormData>) {
  return http.put<Event>(`/eventos/${id}`, data);
}

export function deleteEvent(id: string) {
  return http.delete(`/eventos/${id}`);
}

// ─── Regras de Check-in ───────────────────────────────────────────────────────

export function getRegrasCheckin(eventoId: string) {
  return http.get<CheckinRule>(`/eventos/${eventoId}/regras-checkin`);
}

export function updateRegrasCheckin(
  eventoId: string,
  data: Partial<Omit<CheckinRule, "eventoId">>
) {
  return http.put<CheckinRule>(`/eventos/${eventoId}/regras-checkin`, data);
}

// ─── Participantes ────────────────────────────────────────────────────────────

export function getParticipantes(eventoId?: string) {
  const query = eventoId ? `?eventoId=${eventoId}` : "";
  return http.get<Participant[]>(`/participantes${query}`);
}

export function getParticipante(id: string) {
  return http.get<Participant>(`/participantes/${id}`);
}

export function createParticipante(data: ParticipantFormData) {
  return http.post<Participant>("/participantes", data);
}

export function updateParticipante(
  id: string,
  data: Partial<ParticipantFormData & { checkin: boolean }>
) {
  return http.put<Participant>(`/participantes/${id}`, data);
}

export function deleteParticipante(id: string) {
  return http.delete(`/participantes/${id}`);
}
