import { Response } from 'express'
import { supabase } from '../config/supabase.js'
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js'
import { v4 as uuidv4 } from 'uuid'
import { AuthenticatedRequest } from '../middleware/auth.js'

/**
 * GET /api/kegiatan
 * Get all activities with filters, search, and pagination
 */
export const getAll = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const page = typeof req.query.page === 'string' ? req.query.page : '1'
  const limit = typeof req.query.limit === 'string' ? req.query.limit : '10'
  const search = typeof req.query.search === 'string' ? req.query.search : ''
  const status = typeof req.query.status === 'string' ? req.query.status : ''
  const kategori = typeof req.query.kategori === 'string' ? req.query.kategori : ''
  const bulan = typeof req.query.bulan === 'string' ? req.query.bulan : ''
  const tahun = typeof req.query.tahun === 'string' ? req.query.tahun : ''
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'tanggal_kegiatan'
  const order = typeof req.query.order === 'string' ? req.query.order : 'desc'

  const offset = (parseInt(page) - 1) * parseInt(limit)
  const allowedSorts = ['tanggal_kegiatan', 'nama_kegiatan', 'created_at', 'status']
  const sortField = allowedSorts.includes(sort) ? sort : 'tanggal_kegiatan'
  const sortOrder = order === 'asc'

  let query = supabase
    .from('kegiatan')
    .select('*, penanggung_jawab:admins!kegiatan_penanggung_jawab_id_fkey(id, name, division)', { count: 'exact' })

  if (search) {
    query = query.or(`nama_kegiatan.ilike.%${search}%,deskripsi.ilike.%${search}%,lokasi.ilike.%${search}%`)
  }
  if (status) query = query.eq('status', status)
  if (kategori) query = query.eq('kategori', kategori)
  if (bulan) query = query.eq('bulan', parseInt(bulan))
  if (tahun) query = query.eq('tahun', parseInt(tahun))

  query = query
    .order(sortField, { ascending: sortOrder })
    .range(offset, offset + parseInt(limit) - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching kegiatan:', error)
    return sendError(res, 'Gagal mengambil data kegiatan')
  }

  return sendPaginated(res, data, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: count || 0,
    totalPages: Math.ceil((count || 0) / parseInt(limit))
  })
}

/**
 * GET /api/kegiatan/:id
 * Get single activity with detail
 */
export const getById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('kegiatan')
    .select(`
      *,
      penanggung_jawab:admins!kegiatan_penanggung_jawab_id_fkey(id, name, division),
      berita_acara(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return sendError(res, 'Kegiatan tidak ditemukan', 404)
  }

  return sendSuccess(res, data)
}

/**
 * POST /api/kegiatan
 * Create new activity
 */
export const create = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const {
    nama_kegiatan,
    deskripsi,
    tanggal_kegiatan,
    waktu_mulai,
    waktu_selesai,
    lokasi,
    kategori,
    penanggung_jawab_id,
    anggota_kegiatan,
    target_peserta,
    anggaran
  } = req.body

  if (!nama_kegiatan || !tanggal_kegiatan || !lokasi) {
    return sendError(res, 'Nama kegiatan, tanggal, and lokasi wajib diisi', 400)
  }

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  const tanggal = new Date(tanggal_kegiatan)
  const newKegiatan = {
    id: uuidv4(),
    nama_kegiatan: (nama_kegiatan as string).trim(),
    deskripsi: deskripsi || '',
    tanggal_kegiatan,
    waktu_mulai: waktu_mulai || null,
    waktu_selesai: waktu_selesai || null,
    lokasi: (lokasi as string).trim(),
    kategori: kategori || 'umum',
    status: 'direncanakan',
    penanggung_jawab_id: penanggung_jawab_id || user.id,
    anggota_kegiatan: anggota_kegiatan || [],
    target_peserta: target_peserta || null,
    anggaran: anggaran || null,
    bulan: tanggal.getMonth() + 1,
    tahun: tanggal.getFullYear(),
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('kegiatan')
    .insert(newKegiatan)
    .select()
    .single()

  if (error) {
    console.error('Error creating kegiatan:', error)
    return sendError(res, 'Gagal membuat kegiatan')
  }

  return sendSuccess(res, data, 'Kegiatan berhasil dibuat', 201)
}

/**
 * PUT /api/kegiatan/:id
 * Update activity
 */
export const update = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params
  const updates = req.body

  // Prevent overwriting system fields
  delete updates.id
  delete updates.created_by
  delete updates.created_at

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  if (updates.tanggal_kegiatan) {
    const tanggal = new Date(updates.tanggal_kegiatan)
    updates.bulan = tanggal.getMonth() + 1
    updates.tahun = tanggal.getFullYear()
  }

  updates.updated_at = new Date().toISOString()
  updates.updated_by = user.id

  const { data, error } = await supabase
    .from('kegiatan')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return sendError(res, 'Gagal memperbarui kegiatan')
  }

  return sendSuccess(res, data, 'Kegiatan berhasil diperbarui')
}

/**
 * PATCH /api/kegiatan/:id/status
 * Update activity status only
 */
export const updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params
  const { status } = req.body
  const validStatuses = ['direncanakan', 'berjalan', 'selesai', 'dibatalkan']

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  if (!validStatuses.includes(status)) {
    return sendError(res, `Status tidak valid. Pilih: ${validStatuses.join(', ')}`, 400)
  }

  const { data, error } = await supabase
    .from('kegiatan')
    .update({ status, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', id)
    .select()
    .single()

  if (error) return sendError(res, 'Gagal memperbarui status')
  return sendSuccess(res, data, `Status kegiatan diubah menjadi "${status}"`)
}

/**
 * DELETE /api/kegiatan/:id
 * Delete activity (soft delete)
 */
export const remove = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params

  const user = req.user
  if (!user) {
    return sendError(res, 'Pengguna tidak terautentikasi', 401)
  }

  const { error } = await supabase
    .from('kegiatan')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', id)

  if (error) return sendError(res, 'Gagal menghapus kegiatan')
  return sendSuccess(res, null, 'Kegiatan berhasil dihapus')
}

/**
 * GET /api/kegiatan/stats/summary
 * Dashboard statistics
 */
export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [totalResult, statusResult, kategoriResult] = await Promise.all([
    supabase.from('kegiatan').select('id', { count: 'exact' }).is('deleted_at', null),
    supabase.from('kegiatan').select('status').is('deleted_at', null),
    supabase.from('kegiatan').select('kategori').is('deleted_at', null)
  ])

  // Count by status
  const byStatus: Record<string, number> = {}
  if (statusResult.data) {
    statusResult.data.forEach(k => {
      byStatus[k.status] = (byStatus[k.status] || 0) + 1
    })
  }

  // Count by category
  const byKategori: Record<string, number> = {}
  if (kategoriResult.data) {
    kategoriResult.data.forEach(k => {
      byKategori[k.kategori] = (byKategori[k.kategori] || 0) + 1
    })
  }

  return sendSuccess(res, {
    total: totalResult.count || 0,
    byStatus,
    byKategori,
    currentMonth,
    currentYear
  }, 'Statistik kegiatan')
}
