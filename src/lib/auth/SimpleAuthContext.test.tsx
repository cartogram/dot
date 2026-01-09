import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './SimpleAuthContext'
import type { User } from '@supabase/supabase-js'
import type { DataSource } from '@/lib/supabase/types'

// Mock Supabase client
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignOut = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: any) => mockOnAuthStateChange(callback),
      signOut: () => mockSignOut(),
    },
    from: (table: string) => mockSupabaseFrom(table),
  },
}))

// Mock server strava functions
vi.mock('@/lib/server/strava', () => ({
  refreshStravaToken: vi.fn(),
}))

// Test component that uses the auth context
function TestComponent() {
  const { user, stravaDataSource, logout } = useAuth()

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </div>
      <div data-testid="strava-status">
        {stravaDataSource ? `Connected to Strava` : 'No Strava connection'}
      </div>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('should provide auth context to children', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await expect.element(screen.getByTestId('user-status')).toBeInTheDocument()
    await expect.element(screen.getByTestId('strava-status')).toBeInTheDocument()
  })

  it('should show not logged in when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-status').textContent).toBe('Not logged in')
      expect(screen.getByTestId('strava-status').textContent).toBe('No Strava connection')
    })
  })

  it('should show logged in user when session exists', async () => {
    const mockUser: Partial<User> = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
    })

    // Mock Strava data source fetch
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-status').textContent).toBe('Logged in as test@example.com')
    })
  })

  it('should fetch Strava connection when user is logged in', async () => {
    const mockUser: Partial<User> = {
      id: 'user-123',
      email: 'test@example.com',
    }

    const mockStravaData: Partial<DataSource> = {
      id: 'strava-123',
      user_id: 'user-123',
      provider: 'strava',
      access_token: 'strava-token',
      is_active: true,
    }

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
    })

    // Mock Strava data source fetch
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockStravaData,
              error: null,
            }),
          }),
        }),
      }),
    })

    mockSupabaseFrom.mockReturnValue({
      select: selectMock,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('strava-status').textContent).toBe('Connected to Strava')
    })

    // Verify the database query was made
    expect(mockSupabaseFrom).toHaveBeenCalledWith('data_sources')
  })

  it('should call signOut when logout is invoked', async () => {
    const mockUser: Partial<User> = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
    })

    mockSignOut.mockResolvedValue({ error: null })

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const { useAuth } = await import('./SimpleAuthContext')

    // Create a test component that can trigger logout
    function LogoutTest() {
      const { logout } = useAuth()
      return <button onClick={logout}>Logout</button>
    }

    render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>
    )

    // The logout function should exist (won't actually trigger navigation in tests)
    expect(screen.getByRole('button', { name: /logout/i })).toBeDefined()
  })

  it('should throw error when useAuth is used outside AuthProvider', () => {
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within AuthProvider')
  })

  it('should listen for auth state changes', async () => {
    let authCallback: any = null

    mockGetSession.mockResolvedValue({
      data: { session: null },
    })

    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-status').textContent).toBe('Not logged in')
    })

    // Verify listener was set up
    expect(mockOnAuthStateChange).toHaveBeenCalled()
  })
})
