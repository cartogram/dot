/**
 * Auth Server Functions
 *
 * Handles user authentication using TanStack Start's useSession
 * and secure password hashing with scrypt.
 */

import crypto from 'crypto'
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import {
  hashPassword,
  comparePasswords,
  generateSalt,
} from '@/lib/auth/password'
import { useAppSession } from '@/lib/auth/session'
import { generateUniqueUsername } from '@/lib/auth/username'

// =====================================================
// SCHEMAS
// =====================================================

const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).optional(),
})

const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// =====================================================
// TYPES
// =====================================================

export interface AuthUser {
  id: string
  email: string
  username: string
  fullName: string | null
  profilePublic: boolean
  role: 'USER' | 'ADMIN'
  createdAt: Date
  updatedAt: Date
}

// =====================================================
// SIGN UP
// =====================================================

export const signUp = createServerFn({ method: 'POST' })
  .inputValidator(SignUpSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (existing) {
      return { error: 'Email already registered' }
    }

    // Create user with secure password
    const salt = generateSalt()
    const hashedPassword = await hashPassword(data.password, salt)

    // Generate a unique username from email
    const username = await generateUniqueUsername(data.email)

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username,
        password: hashedPassword,
        salt,
        fullName: data.fullName,
      },
    })

    // Set session
    await session.update({
      userId: user.id,
      email: user.email,
    })

    return { success: true, userId: user.id }
  })

// =====================================================
// SIGN IN
// =====================================================

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator(SignInSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (!user || !user.password || !user.salt) {
      return { error: 'Invalid email or password' }
    }

    const validPassword = await comparePasswords(
      data.password,
      user.salt,
      user.password,
    )
    if (!validPassword) {
      return { error: 'Invalid email or password' }
    }

    // Set session
    await session.update({
      userId: user.id,
      email: user.email,
    })

    return { success: true, userId: user.id }
  })

// =====================================================
// SIGN OUT
// =====================================================

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/login' })
})

// =====================================================
// GET CURRENT USER (for route context)
// =====================================================

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthUser | null> => {
    const session = await useAppSession()

    if (!session.data.userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.data.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        profilePublic: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return user
  },
)

// =====================================================
// LEGACY ALIAS (for existing code compatibility)
// =====================================================

export const getAuthUser = getCurrentUser

// =====================================================
// REQUEST PASSWORD RESET
// =====================================================

const RequestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const requestPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator(RequestResetSchema)
  .handler(async ({ data }) => {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true }
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex')

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken },
    })

    // TODO: Send email with reset link
    // For now, just log the token (in production, this should send an email)
    console.log(`Password reset token for ${user.email}: ${resetToken}`)

    return { success: true }
  })

// =====================================================
// RESET PASSWORD WITH TOKEN
// =====================================================

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const resetPassword = createServerFn({ method: 'POST' })
  .inputValidator(ResetPasswordSchema)
  .handler(async ({ data }) => {
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: data.token },
    })

    if (!user) {
      return { error: 'Invalid or expired reset token' }
    }

    // Hash new password
    const salt = generateSalt()
    const hashedPassword = await hashPassword(data.password, salt)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        salt,
        resetPasswordToken: null, // Clear the token
      },
    })

    return { success: true }
  })

// =====================================================
// UPDATE PASSWORD (for authenticated users)
// =====================================================

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const updatePassword = createServerFn({ method: 'POST' })
  .inputValidator(UpdatePasswordSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    if (!session.data.userId) {
      return { error: 'Not authenticated' }
    }

    // Hash new password
    const salt = generateSalt()
    const hashedPassword = await hashPassword(data.password, salt)

    await prisma.user.update({
      where: { id: session.data.userId },
      data: {
        password: hashedPassword,
        salt,
      },
    })

    return { success: true }
  })

// =====================================================
// GET USER WITH STRAVA DATA
// =====================================================

export const getCurrentUserWithStrava = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await useAppSession()

  if (!session.data.userId) {
    return { user: null, stravaDataSource: null }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.data.userId },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      profilePublic: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return { user: null, stravaDataSource: null }
  }

  const stravaDataSource = await prisma.dataSource.findFirst({
    where: {
      userId: user.id,
      provider: 'strava',
      isActive: true,
    },
  })

  return { user, stravaDataSource }
})

// =====================================================
// UPDATE PROFILE SETTINGS
// =====================================================

const UpdateProfileSchema = z.object({
  profilePublic: z.boolean().optional(),
  fullName: z.string().optional(),
})

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator(UpdateProfileSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    if (!session.data.userId) {
      return { error: 'Not authenticated' }
    }

    const updateData: { profilePublic?: boolean; fullName?: string } = {}

    if (data.profilePublic !== undefined) {
      updateData.profilePublic = data.profilePublic
    }

    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName
    }

    await prisma.user.update({
      where: { id: session.data.userId },
      data: updateData,
    })

    return { success: true }
  })
