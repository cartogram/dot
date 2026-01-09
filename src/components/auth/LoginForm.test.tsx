import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from 'vitest/browser'
import { LoginForm } from './LoginForm'

// Mock navigate function
const mockNavigate = vi.fn()

// Mock the dependencies with vi.hoisted
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form with all fields', async () => {
    render(<LoginForm />)

    // Check that all form elements are present
    await expect.element(screen.getByText(/welcome back/i)).toBeInTheDocument()
    await expect.element(screen.getByLabelText(/email/i)).toBeInTheDocument()
    await expect.element(screen.getByLabelText(/password/i)).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('should have links to signup and password reset', async () => {
    render(<LoginForm />)

    const signupLink = screen.getByRole('link', { name: /sign up/i })
    const resetLink = screen.getByRole('link', { name: /forgot your password/i })

    await expect.element(signupLink).toBeInTheDocument()
    await expect.element(resetLink).toBeInTheDocument()

    expect(signupLink.getAttribute('href')).toBe('/signup')
    expect(resetLink.getAttribute('href')).toBe('/reset-password')
  })

  it('should update email and password fields on input', async () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    await userEvent.fill(emailInput, 'test@example.com')
    await userEvent.fill(passwordInput, 'password123')

    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('should disable form during submission', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    // Mock a slow login
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { user: null, session: null }, error: null }), 100))
    )

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await userEvent.fill(emailInput, 'test@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(submitButton)

    // Check that button shows loading state
    await expect.element(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument()

    // Check that inputs are disabled
    expect((emailInput as HTMLInputElement).disabled).toBe(true)
    expect((passwordInput as HTMLInputElement).disabled).toBe(true)
  })

  it('should display error message on failed login', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await userEvent.fill(emailInput, 'wrong@example.com')
    await userEvent.fill(passwordInput, 'wrongpassword')
    await userEvent.click(submitButton)

    await expect.element(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
  })

  it('should call signInWithPassword with correct credentials', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: '1' }, session: { access_token: 'token' } },
      error: null,
    } as any)

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    await userEvent.fill(emailInput, 'test@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(submitButton)

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('should require email and password fields', async () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    expect(emailInput.required).toBe(true)
    expect(passwordInput.required).toBe(true)
    expect(emailInput.type).toBe('email')
    expect(passwordInput.type).toBe('password')
  })
})
