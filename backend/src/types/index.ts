import { Request } from 'express'

export interface AuthUser {
  id: string
  email: string
  teamId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ApiResponse<T> {
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface GoogleCalendarTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
}
