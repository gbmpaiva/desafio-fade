export type CheckinRuleType = 'qr_code' | 'document' | 'printed_list' | 'email_confirmation' | 'custom'

export interface CheckinRule {
  id: string
  eventId: string
  name: string
  type: CheckinRuleType
  isActive: boolean
  isRequired: boolean
  windowBefore: number
  windowAfter: number
  order: number
  createdAt: string
  updatedAt: string
}

export interface CreateCheckinRulePayload {
  name: string
  type: CheckinRuleType
  isRequired: boolean
  windowBefore: number
  windowAfter: number
}

export interface CheckinRuleConflict {
  ruleAId: string
  ruleBId: string
  ruleAName: string
  ruleBName: string
  reason: string
}

export interface CheckinValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  conflicts: CheckinRuleConflict[]
}