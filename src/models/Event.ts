import { CheckinRule } from "./CheckinRule";

export type EventStatus = 'active' | 'closed' | 'cancelled';

export interface Event {
  id: string
  name: string
  date: string
  location: string
  status: EventStatus
  capacity: number
  participantCount: number
  checkinrule?: CheckinRule
  description?: string
  createdAt: string
  updatedAt: string
}

export type CreateEventPayload = Omit<Event, 'id' | 'participantCount' | 'createdAt' | 'updatedAt'>
export type UpdateEventPayload = Partial<CreateEventPayload>

export interface EventFormData{
  name: string;
  description?: string;
  date: string;
  location: string;
  capacity: number;
  status: EventStatus;
}