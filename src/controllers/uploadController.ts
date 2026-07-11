import { Response } from 'express'
import { supabase } from '../config/supabase.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { AuthenticatedRequest } from '../middleware/auth.js'

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File
}

/**
 * POST /api/upload/image
 * Upload image to Supabase Storage
 */
export const uploadImage = async (req: RequestWithFile, res: Response): Promise<any> => {
  if (!req.file) return sendError(res, 'Tidak ada file yang diunggah', 400)

  const ext = path.extname(req.file.originalname).toLowerCase()
  const fileName = `${uuidv4()}${ext}`
  const folder = req.body.folder || 'general'
  const filePath = `${folder}/${fileName}`

  const { data, error } = await supabase.storage
    .from('kkn-padepokan')
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    return sendError(res, 'Gagal mengunggah file')
  }

  const { data: urlData } = supabase.storage
    .from('kkn-padepokan')
    .getPublicUrl(filePath)

  return sendSuccess(res, {
    url: urlData.publicUrl,
    path: filePath,
    name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  }, 'File berhasil diunggah', 201)
}

/**
 * POST /api/upload/document
 * Upload document to Supabase Storage
 */
export const uploadDocument = async (req: RequestWithFile, res: Response): Promise<any> => {
  if (!req.file) return sendError(res, 'Tidak ada file yang diunggah', 400)

  const ext = path.extname(req.file.originalname).toLowerCase()
  const fileName = `${uuidv4()}${ext}`
  const filePath = `dokumen/${fileName}`

  const { error } = await supabase.storage
    .from('kkn-padepokan')
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    })

  if (error) return sendError(res, 'Gagal mengunggah dokumen')

  const { data: urlData } = supabase.storage
    .from('kkn-padepokan')
    .getPublicUrl(filePath)

  return sendSuccess(res, {
    url: urlData.publicUrl,
    path: filePath,
    name: req.file.originalname,
    size: req.file.size
  }, 'Dokumen berhasil diunggah', 201)
}

/**
 * DELETE /api/upload
 * Delete file from Supabase Storage
 */
export const deleteFile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { filePath } = req.body
  if (!filePath) return sendError(res, 'Path file diperlukan', 400)

  const { error } = await supabase.storage
    .from('kkn-padepokan')
    .remove([filePath])

  if (error) return sendError(res, 'Gagal menghapus file')
  return sendSuccess(res, null, 'File berhasil dihapus')
}
