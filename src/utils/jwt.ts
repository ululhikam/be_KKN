import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const JWT_EXPIRES_IN = '24h'
const REFRESH_EXPIRES_IN = '7d'

export interface TokenPayload {
  id: string
  email: string
  name: string
  role: string
  division?: string
  nim?: string
  prodi?: string
}

/**
 * Generate access + refresh tokens for a user
 */
export function generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
  return { accessToken, refreshToken }
}

/**
 * Verify a JWT token and return decoded payload
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export default { generateTokens, verifyToken }
