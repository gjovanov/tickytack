import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const PBKDF2_ITERATIONS = 100000
const PBKDF2_SALT = 'tickytack-jira-token-salt'

function deriveKey(key: string): Buffer {
  return pbkdf2Sync(key, PBKDF2_SALT, PBKDF2_ITERATIONS, 32, 'sha256')
}

function deriveKeyLegacy(key: string): Buffer {
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8')
}

export function encrypt(plaintext: string, key: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, deriveKey(key), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decrypt(ciphertext: string, key: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')

  // Try PBKDF2-derived key first, fall back to legacy for existing tokens
  try {
    const decipher = createDecipheriv(ALGORITHM, deriveKey(key), iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf8')
  } catch {
    const decipher = createDecipheriv(ALGORITHM, deriveKeyLegacy(key), iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }
}
