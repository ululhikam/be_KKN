import { Router } from 'express'
import {
  getAll, getById, create, update, updateStatus, remove, getStats
} from '../controllers/kegiatanController.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Public endpoints (for the main website)
router.get('/', getAll as any)
router.get('/stats/summary', getStats as any)
router.get('/:id', getById as any)

// Admin-protected
router.post('/', authenticate as any, create as any)
router.put('/:id', authenticate as any, update as any)
router.patch('/:id/status', authenticate as any, updateStatus as any)
router.delete('/:id', authenticate as any, requireAdmin as any, remove as any)

export default router
