/**
 * Factory pour créer des utilisateurs de test
 * Support pour les différents types d'utilisateurs (guest, authenticated, admin)
 */

import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface MockUser extends Partial<User> {
  id: string
  email?: string
  email_confirmed_at?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
}

interface MockProfile extends Partial<Profile> {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  is_admin?: boolean
}

export interface UserWithProfile {
  user: MockUser
  profile: MockProfile
}

export class UserFactory {
  private static userCounter = 1
  
  /**
   * Crée un utilisateur invité (non connecté)
   */
  static guest(): { user: null; profile: null } {
    return { user: null, profile: null }
  }
  
  /**
   * Crée un utilisateur authentifié standard
   */
  static authenticated(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
    const id = overrides.user?.id || `user-${this.userCounter++}`
    const email = overrides.user?.email || `user${this.userCounter}@example.com`
    
    return {
      user: {
        id,
        email,
        email_confirmed_at: '2024-01-01T00:00:00.000Z',
        user_metadata: {
          email,
          email_verified: true,
          phone_verified: false,
          sub: id,
        },
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        ...overrides.user,
      },
      profile: {
        id,
        email,
        first_name: 'John',
        last_name: 'Doe',
        is_admin: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        ...overrides.profile,
      },
    }
  }
  
  /**
   * Crée un utilisateur admin
   */
  static admin(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
    const base = this.authenticated(overrides)
    
    return {
      ...base,
      user: {
        ...base.user,
        email: overrides.user?.email || 'admin@herbisveritas.com',
        user_metadata: {
          ...base.user.user_metadata,
          role: 'admin',
        },
        ...overrides.user,
      },
      profile: {
        ...base.profile,
        email: overrides.user?.email || 'admin@herbisveritas.com',
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
        ...overrides.profile,
      },
    }
  }
  
  /**
   * Crée un utilisateur avec des permissions spécifiques
   */
  static withPermissions(
    permissions: string[],
    overrides: Partial<UserWithProfile> = {}
  ): UserWithProfile {
    const base = this.authenticated(overrides)
    
    return {
      ...base,
      user: {
        ...base.user,
        app_metadata: {
          ...base.user.app_metadata,
          permissions,
        },
        ...overrides.user,
      },
    }
  }
  
  /**
   * Crée plusieurs utilisateurs pour les tests de batch
   */
  static createBatch(count: number, factory: () => UserWithProfile = () => this.authenticated()): UserWithProfile[] {
    return Array.from({ length: count }, () => factory())
  }
  
  /**
   * Reset le compteur pour des tests reproductibles
   */
  static resetCounter(): void {
    this.userCounter = 1
  }
}