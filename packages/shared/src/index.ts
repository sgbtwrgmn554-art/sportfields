export type SportType = 'basketball' | 'football' | 'tennis' | 'other'
export type PrivacyLevel = 'public' | 'friends' | 'anonymous' | 'hidden'

export interface Court {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  sport_types: SportType[]
  active_players: number
  verified: boolean
}

export interface User {
  id: string
  name: string
  avatar_url?: string
  is_premium: boolean
  privacy_default: PrivacyLevel
}

export interface Checkin {
  id: string
  user_id: string
  court_id: string
  privacy: PrivacyLevel
  checked_in_at: string
  checked_out_at?: string
}

export interface Game {
  id: string
  court_id: string
  creator_id: string
  sport: SportType
  starts_at: string
  max_players?: number
  is_public: boolean
  player_count: number
}
