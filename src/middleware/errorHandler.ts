import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response.js'

/**
 * Global error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err)

  // Supabase specific errors
  if (err.code === 'PGRST116') {
    return sendError(res, 'Data tidak ditemukan', 404)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Token tidak valid', 401)
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token telah kedaluwarsa', 401)
  }

  // Multer (file upload) errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'Ukuran file terlalu besar (maksimal 5MB)', 413)
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Tipe file tidak diizinkan', 400)
  }

  const statusCode = err.statusCode || err.status || 500
  const message = err.message || 'Terjadi kesalahan server'

  return sendError(res, message, statusCode)
}

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  return sendError(res, `Endpoint ${req.method} ${req.path} tidak ditemukan`, 404)
}
