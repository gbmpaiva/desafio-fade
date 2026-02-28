export type EventStatus = 'active' | 'closed' | 'draft'

export interface Event {
  id: string
  name: string
  date: string
  location: string
  status: EventStatus
  capacity: number
  participantCount: number
  description?: string
  createdAt: string
  updatedAt: string
}

export type CreateEventPayload = Omit<Event, 'id' | 'participantCount' | 'createdAt' | 'updatedAt'>
export type UpdateEventPayload = Partial<CreateEventPayload>