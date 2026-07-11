import { Response } from 'express'
import { supabase } from '../config/supabase.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { v4 as uuidv4 } from 'uuid'
import { AuthenticatedRequest } from '../middleware/auth.js'

/**
 * GET /api/galeri
 * Get all gallery items
 */
export const getAll = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const category = typeof req.query.category === 'string' ? req.query.category : ''

  let query = supabase
    .from('galeri')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching galeri:', error)
    return sendError(res, 'Gagal mengambil data galeri')
  }

  return sendSuccess(res, data, 'Berhasil mengambil data galeri')
}

/**
 * GET /api/galeri/:id
 * Get single gallery item
 */
export const getById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('galeri')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return sendError(res, 'Item galeri tidak ditemukan', 404)
  }

  return sendSuccess(res, data, 'Berhasil mengambil detail galeri')
}

/**
 * POST /api/galeri
 * Create new gallery item
 */
export const create = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { title, category, date, description, image_url } = req.body
  const user = req.user

  if (!title || !category || !date || !image_url) {
    return sendError(res, 'Judul, kategori, tanggal, dan URL gambar wajib diisi', 400)
  }

  const newGaleri = {
    id: uuidv4(),
    title: title.trim(),
    category: category.trim(),
    date: date.trim(),
    description: description || '',
    image_url: image_url.trim(),
    created_by: user?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('galeri')
    .insert(newGaleri)
    .select()
    .single()

  if (error) {
    console.error('Error creating galeri:', error)
    return sendError(res, 'Gagal menambahkan foto galeri')
  }

  return sendSuccess(res, data, 'Foto galeri berhasil ditambahkan', 201)
}

/**
 * PUT /api/galeri/:id
 * Update gallery item
 */
export const update = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params
  const updates = req.body

  delete updates.id
  delete updates.created_by
  delete updates.created_at

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('galeri')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating galeri:', error)
    return sendError(res, 'Gagal memperbarui foto galeri')
  }

  return sendSuccess(res, data, 'Foto galeri berhasil diperbarui')
}

/**
 * DELETE /api/galeri/:id
 * Soft delete gallery item
 */
export const remove = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params
  const user = req.user

  const { data, error } = await supabase
    .from('galeri')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id || null
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error deleting galeri:', error)
    return sendError(res, 'Gagal menghapus foto galeri')
  }

  return sendSuccess(res, null, 'Foto galeri berhasil dihapus')
}
