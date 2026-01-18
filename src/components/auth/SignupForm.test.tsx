import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from 'vitest/browser'
import { SignupForm } from './SignupForm'

// Mock navigate function
const mockNavigate = vi.fn()

// Mock the dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render signup form with all fields', async () => {
    render(<SignupForm />)

    // Check that all form elements are present
    await expect
      .element(screen.getByText(/create an account/i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toBeInTheDocument()
    await expect.element(screen.getByLabelText(/email/i)).toBeInTheDocument()
    await expect.element(screen.getByLabelText(/password/i)).toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /sign up/i }))
      .toBeInTheDocument()
  })

  it('should have link to login page', async () => {
    render(<SignupForm />)

    const loginLink = screen.getByRole('link', { name: /log in/i })

    await expect.element(loginLink).toBeInTheDocument()
    expect(loginLink.getAttribute('href')).toBe('/login')
  })

  it('should show password requirements hint', async () => {
    render(<SignupForm />)

    await expect
      .element(screen.getByText(/must be at least 6 characters/i))
      .toBeInTheDocument()
  })

  it('should update all fields on input', async () => {
    render(<SignupForm />)

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    await userEvent.fill(nameInput, 'John Doe')
    await userEvent.fill(emailInput, 'john@example.com')
    await userEvent.fill(passwordInput, 'password123')

    expect(nameInput.value).toBe('John Doe')
    expect(emailInput.value).toBe('john@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('should enforce password minimum length', async () => {
    render(<SignupForm />)

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(passwordInput.minLength).toBe(6)
  })

  it('should disable form during submission', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    // Mock a slow signup
    vi.mocked(supabase.auth.signUp).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { user: null, session: null }, error: null }),
            100,
          ),
        ),
    )

    render(<SignupForm />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await userEvent.fill(nameInput, 'John Doe')
    await userEvent.fill(emailInput, 'john@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(submitButton)

    // Check that button shows loading state
    await expect
      .element(screen.getByRole('button', { name: /creating account/i }))
      .toBeInTheDocument()

    // Check that inputs are disabled
    expect((nameInput as HTMLInputElement).disabled).toBe(true)
    expect((emailInput as HTMLInputElement).disabled).toBe(true)
    expect((passwordInput as HTMLInputElement).disabled).toBe(true)
  })

  it('should display error message on failed signup', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Email already registered'),
    })

    render(<SignupForm />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await userEvent.fill(nameInput, 'John Doe')
    await userEvent.fill(emailInput, 'existing@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(/email already registered/i))
      .toBeInTheDocument()
  })

  it('should show email confirmation message when email verification is required', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com' }, session: null },
      error: null,
    } as any)

    render(<SignupForm />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await userEvent.fill(nameInput, 'John Doe')
    await userEvent.fill(emailInput, 'john@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await expect
      .element(
        screen.getByText(/please check your email to confirm your account/i),
      )
      .toBeInTheDocument()
  })

  it('should call signUp with correct data', async () => {
    const { supabase } = await import('@/lib/supabase/client')

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: '1' }, session: { access_token: 'token' } },
      error: null,
    } as any)

    render(<SignupForm />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await userEvent.fill(nameInput, 'John Doe')
    await userEvent.fill(emailInput, 'john@example.com')
    await userEvent.fill(passwordInput, 'password123')
    await userEvent.click(submitButton)

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'John Doe',
        },
        emailRedirectTo: expect.stringContaining('/auth/confirm'),
      },
    })
  })

  it('should require all fields', async () => {
    render(<SignupForm />)

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    expect(nameInput.required).toBe(true)
    expect(emailInput.required).toBe(true)
    expect(passwordInput.required).toBe(true)
    expect(emailInput.type).toBe('email')
    expect(passwordInput.type).toBe('password')
  })
})
