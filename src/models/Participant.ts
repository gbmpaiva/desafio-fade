export interface Participant {
  id: string
  name: string
  email: string
  eventId: string
  eventName: string
  checkedIn: boolean
  checkedInAt?: string
  phone?: string
  createdAt: string
}

export interface CreateParticipantPayload {
  name: string
  email: string
  eventId: string
  phone?: string
}
