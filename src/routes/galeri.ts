import { Router } from 'express'
import {
  getAll, getById, create, update, remove
} from '../controllers/galeriController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Public endpoints (for the main website gallery)
router.get('/', getAll as any)
router.get('/:id', getById as any)

// Admin-protected
router.post('/', authenticate as any, create as any)
router.put('/:id', authenticate as any, update as any)
router.delete('/:id', authenticate as any, remove as any)

export default router
