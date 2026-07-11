import { Router } from 'express'
import {
  getAll, getById, create, update, approve, submit, remove, exportBA
} from '../controllers/beritaAcaraController.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// All berita acara routes require authentication
router.use(authenticate as any)

router.get('/', getAll as any)
router.get('/:id', getById as any)
router.get('/:id/export', exportBA as any)
router.post('/', create as any)
router.put('/:id', update as any)
router.patch('/:id/submit', submit as any)
router.patch('/:id/approve', requireAdmin as any, approve as any)
router.delete('/:id', remove as any)

export default router
