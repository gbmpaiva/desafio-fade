export interface DashboardStats {
  totalEvents: number
  activeEvents: number
  totalParticipants: number
  totalCheckins: number
  checkinToday: number
  upcomingEvents: UpcomingEvent[]
  recentActivity: ActivityItem[]
}

export interface UpcomingEvent {
  id: string
  name: string
  date: string
  location: string
  participantCount: number
  capacity: number
}

export interface ActivityItem {
  id: string
  type: 'checkin' | 'event_created' | 'participant_added' | 'event_updated'
  description: string
  timestamp: string
  eventId?: string
}
