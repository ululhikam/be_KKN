import { Response } from 'express'

/**
 * Standard API response helpers
 */
export const sendSuccess = (res: Response, data: any, message = 'Berhasil', statusCode = 200): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  })
}

export const sendError = (res: Response, message = 'Terjadi kesalahan', statusCode = 500, errors: any = null): Response => {
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  }
  if (errors) response.errors = errors
  return res.status(statusCode).json(response)
}

export const sendPaginated = (res: Response, data: any, pagination: any, message = 'Berhasil'): Response => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  })
}
