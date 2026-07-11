import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../config/supabase.js'
import { generateTokens, verifyToken } from '../utils/jwt.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { AuthenticatedRequest } from '../middleware/auth.js'

/**
 * POST /api/auth/login
 * Admin login
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body

  if (!email || !password) {
    return sendError(res, 'Email dan password diperlukan', 400)
  }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', (email as string).toLowerCase().trim())
    .single()

  if (error || !admin) {
    return sendError(res, 'Email atau password salah', 401)
  }

  if (!admin.is_active) {
    return sendError(res, 'Akun tidak aktif. Hubungi administrator.', 403)
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
  if (!isPasswordValid) {
    return sendError(res, 'Email atau password salah', 401)
  }

  // Update last login
  await supabase
    .from('admins')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id)

  const payload = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    division: admin.division,
    nim: admin.nim,
    prodi: admin.prodi
  }

  const { accessToken, refreshToken } = generateTokens(payload)

  return sendSuccess(res, {
    user: payload,
    accessToken,
    refreshToken
  }, 'Login berhasil')
}

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export const refresh = async (req: Request, res: Response): Promise<any> => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return sendError(res, 'Refresh token diperlukan', 400)
  }

  try {
    const decoded = verifyToken(refreshToken)
    const { id, email, name, role, division, nim, prodi } = decoded
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({ id, email, name, role, division, nim, prodi })
    return sendSuccess(res, { accessToken, refreshToken: newRefreshToken }, 'Token diperbarui')
  } catch {
    return sendError(res, 'Refresh token tidak valid atau kedaluwarsa', 401)
  }
}

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, email, name, role, division, avatar_url, last_login, created_at')
    .eq('id', req.user.id)
    .single()

  if (error || !admin) {
    return sendError(res, 'Pengguna tidak ditemukan', 404)
  }
  return sendSuccess(res, admin)
}

/**
 * PUT /api/auth/change-password
 * Change own password
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return sendError(res, 'Password lama dan baru diperlukan', 400)
  }
  if (newPassword.length < 8) {
    return sendError(res, 'Password baru minimal 8 karakter', 400)
  }

  if (!req.user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('password_hash')
    .eq('id', req.user.id)
    .single()

  if (!admin) {
    return sendError(res, 'Pengguna tidak ditemukan', 404)
  }

  const isValid = await bcrypt.compare(currentPassword, admin.password_hash)
  if (!isValid) {
    return sendError(res, 'Password lama tidak sesuai', 400)
  }

  const newHash = await bcrypt.hash(newPassword, 12)
  await supabase
    .from('admins')
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq('id', req.user.id)

  return sendSuccess(res, null, 'Password berhasil diubah')
}

/**
 * GET /api/auth/members
 * Get all members/admins list
 */
export const getAllMembers = async (req: Request, res: Response): Promise<any> => {
  const { data: members, error } = await supabase
    .from('admins')
    .select('id, email, name, role, division, nim, prodi, avatar_url, is_active, last_login, created_at')
    .eq('is_active', true)

  if (error) {
    return sendError(res, error.message, 500)
  }

  // Sort logically by division: ketua first, wakil_ketua, sekretaris, bendahara, humas, acara, pdd
  const divisionOrder = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'acara', 'pdd']
  const sorted = members.sort((a, b) => {
    const idxA = divisionOrder.indexOf(a.division || '')
    const idxB = divisionOrder.indexOf(b.division || '')
    
    // If not found in order array, put at the end
    const valA = idxA === -1 ? 99 : idxA
    const valB = idxB === -1 ? 99 : idxB
    
    return valA - valB
  })

  return sendSuccess(res, sorted, 'Berhasil mengambil daftar anggota')
}
