import multer from 'multer'
import path from 'path'
import { Request } from 'express'

// Store in memory for Supabase upload
const storage = multer.memoryStorage()

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/
  const allowedDocTypes = /pdf|doc|docx|xls|xlsx/
  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase())
    || allowedDocTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedImageTypes.test(file.mimetype)
    || file.mimetype.includes('pdf')
    || file.mimetype.includes('word')
    || file.mimetype.includes('spreadsheet')

  if (extname && mimetype) {
    return cb(null, true)
  }
  cb(new Error('Format file tidak didukung. Izinkan: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX'), false)
}

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter as any
})

export const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter as any
})
