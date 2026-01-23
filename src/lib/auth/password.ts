import crypto from 'crypto'

/**
 * Hash a password using scrypt
 *
 * scrypt is a memory-hard key derivation function that's resistant to
 * hardware brute-force attacks. We use 64-byte output for security.
 */
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const normalizedPassword = password.normalize('NFC')
  return new Promise((resolve, reject) => {
    crypto.scrypt(normalizedPassword, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(derivedKey.toString('hex'))
    })
  })
}

/**
 * Compare a password against a stored hash using timing-safe comparison
 *
 * This prevents timing attacks by ensuring the comparison takes the same
 * amount of time regardless of where the strings differ.
 */
export async function comparePasswords(
  password: string,
  salt: string,
  hashedPassword: string,
): Promise<boolean> {
  const hash = await hashPassword(password, salt)
  const hashBuffer = Buffer.from(hash, 'hex')
  const storedBuffer = Buffer.from(hashedPassword, 'hex')

  if (hashBuffer.length !== storedBuffer.length) return false
  return crypto.timingSafeEqual(hashBuffer, storedBuffer)
}

/**
 * Generate a random salt for password hashing
 *
 * Each user gets a unique salt, making rainbow table attacks impractical.
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}
