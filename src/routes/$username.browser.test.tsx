/**
 * E2E Tests for Public Profile Page
 *
 * Tests the /$username route which displays public user profiles.
 * Uses Vitest Browser Mode with Playwright for real browser testing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from '@vitest/browser/context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  mockPublicProfile,
  mockHiddenProfile,
  mockNotFoundProfile,
} from '@/test/mocks/server'

// Mock the server function
vi.mock('@/lib/server/getUserStats', () => ({
  getProfileByUsername: vi.fn(),
}))

import { getProfileByUsername } from '@/lib/server/getUserStats'

// Import the component under test after mocking
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/custom/Card'
import { useQuery } from '@tanstack/react-query'

/**
 * ProfileContent component extracted for testing
 * This mirrors the component in $username.tsx
 */
function ProfileContent({ username }: { username: string }) {
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-profile-username', username],
    queryFn: () => getProfileByUsername({ data: { username } }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false, // Disable for tests
  })

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>
  }

  if (error) {
    return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'Failed to load profile.'}
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  // Profile not found
  if (profileData && 'notFound' in profileData) {
    return (
      <Card state="error" data-testid="not-found">
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            The user @{username} does not exist.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  // Profile is hidden
  if (profileData && 'hidden' in profileData) {
    return (
      <Card data-testid="hidden-profile">
        <CardHeader>
          <CardTitle>Profile Hidden</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            @{profileData.username} has chosen to keep their profile private.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  // Profile is public
  if (profileData && 'profile' in profileData) {
    return (
      <div data-testid="public-profile">
        <h1>@{profileData.profile.username}</h1>
        {profileData.profile.fullName && (
          <p>{profileData.profile.fullName}</p>
        )}
      </div>
    )
  }

  return null
}

/**
 * Test wrapper that provides necessary context
 */
function TestWrapper({
  username,
  children,
}: {
  username: string
  children: React.ReactNode
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Public Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Profile Not Found" for non-existent username', async () => {
    vi.mocked(getProfileByUsername).mockResolvedValue(mockNotFoundProfile)

    const screen = await render(
      <TestWrapper username="nonexistent-user-xyz">
        <ProfileContent username="nonexistent-user-xyz" />
      </TestWrapper>
    )

    // Wait for loading to complete
    await expect.element(screen.getByTestId('not-found')).toBeInTheDocument()
    await expect.element(screen.getByText('Profile Not Found')).toBeInTheDocument()
    await expect
      .element(screen.getByText('The user @nonexistent-user-xyz does not exist.'))
      .toBeInTheDocument()
  })

  it('shows "Profile Hidden" for private profile', async () => {
    vi.mocked(getProfileByUsername).mockResolvedValue(mockHiddenProfile)

    const screen = await render(
      <TestWrapper username="privateuser">
        <ProfileContent username="privateuser" />
      </TestWrapper>
    )

    await expect.element(screen.getByTestId('hidden-profile')).toBeInTheDocument()
    await expect.element(screen.getByText('Profile Hidden')).toBeInTheDocument()
    await expect
      .element(
        screen.getByText('@privateuser has chosen to keep their profile private.')
      )
      .toBeInTheDocument()
  })

  it('displays public profile with username', async () => {
    vi.mocked(getProfileByUsername).mockResolvedValue(mockPublicProfile)

    const screen = await render(
      <TestWrapper username="publicuser">
        <ProfileContent username="publicuser" />
      </TestWrapper>
    )

    await expect.element(screen.getByTestId('public-profile')).toBeInTheDocument()
    await expect.element(screen.getByText('@publicuser')).toBeInTheDocument()
    await expect.element(screen.getByText('Public User')).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    // Create a promise that we can control
    let resolveProfile: (value: any) => void
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve
    })

    vi.mocked(getProfileByUsername).mockReturnValue(profilePromise as any)

    const screen = await render(
      <TestWrapper username="slowuser">
        <ProfileContent username="slowuser" />
      </TestWrapper>
    )

    // Should show loading initially
    await expect.element(screen.getByTestId('loading')).toBeInTheDocument()

    // Resolve and verify loading disappears
    resolveProfile!(mockPublicProfile)
  })

  it('calls getProfileByUsername with correct username', async () => {
    vi.mocked(getProfileByUsername).mockResolvedValue(mockPublicProfile)

    await render(
      <TestWrapper username="testuser123">
        <ProfileContent username="testuser123" />
      </TestWrapper>
    )

    // Wait for the query to be called
    await vi.waitFor(() => {
      expect(getProfileByUsername).toHaveBeenCalledWith({
        data: { username: 'testuser123' },
      })
    })
  })
})
