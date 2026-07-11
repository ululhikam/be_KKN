import { Response, NextFunction } from 'express'
import { Request as ExpressRequest } from 'express'
import { verifyToken, TokenPayload } from '../utils/jwt.js'
import { sendError } from '../utils/response.js'

export interface AuthenticatedRequest extends ExpressRequest {
  user?: TokenPayload
}

/**
 * Protect routes - require valid JWT
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token autentikasi diperlukan', 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token telah kedaluwarsa', 401)
    }
    return sendError(res, 'Token tidak valid', 401)
  }
}

/**
 * Require admin role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, 'Akses ditolak: Hanya admin yang diizinkan', 403)
  }
  next()
}

/**
 * Optional auth — attaches user if token exists, doesn't block if missing
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      req.user = verifyToken(token)
    } catch (_) {
      // silently ignore invalid token for optional auth
    }
  }
  next()
}
