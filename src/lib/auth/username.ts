/**
 * Username generation utilities
 *
 * Generates URL-safe usernames from email addresses
 * and handles uniqueness conflicts.
 */

import { prisma } from '@/lib/db/client'

/**
 * Generate a URL-safe username from an email address.
 * Takes the part before @ and sanitizes it.
 */
export function generateUsernameFromEmail(email: string): string {
  // Get the part before @
  const localPart = email.split('@')[0]

  // Sanitize: lowercase, replace non-alphanumeric with hyphens, trim hyphens
  const sanitized = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric sequences with hyphens
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens

  // Ensure minimum length
  return sanitized || 'user'
}

/**
 * Generate a unique username from an email address.
 * If the base username is taken, appends incrementing numbers.
 */
export async function generateUniqueUsername(email: string): Promise<string> {
  const baseUsername = generateUsernameFromEmail(email)

  // Check if base username is available
  const existing = await prisma.user.findUnique({
    where: { username: baseUsername },
    select: { id: true },
  })

  if (!existing) {
    return baseUsername
  }

  // Find a unique username by appending numbers
  let counter = 1
  let candidateUsername = `${baseUsername}${counter}`

  while (true) {
    const exists = await prisma.user.findUnique({
      where: { username: candidateUsername },
      select: { id: true },
    })

    if (!exists) {
      return candidateUsername
    }

    counter++
    candidateUsername = `${baseUsername}${counter}`

    // Safety limit to prevent infinite loop
    if (counter > 9999) {
      throw new Error('Unable to generate unique username')
    }
  }
}

/**
 * Validate a username format.
 * Must be 3-30 chars, alphanumeric with hyphens, no leading/trailing hyphens.
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
  return usernameRegex.test(username) || (username.length >= 2 && /^[a-z0-9]{2,30}$/.test(username))
}

/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (!existing) return true
  if (excludeUserId && existing.id === excludeUserId) return true
  return false
}
