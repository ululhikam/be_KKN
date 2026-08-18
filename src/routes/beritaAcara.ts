import { Router } from 'express'
import {
  getAll, getById, create, update, approve, submit, remove, exportBA
} from '../controllers/beritaAcaraController.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Public routes (no auth required) — for public website
router.get('/', getAll as any)
router.get('/:id', getById as any)

// Protected routes (auth required)
router.get('/:id/export', authenticate as any, exportBA as any)
router.post('/', authenticate as any, create as any)
router.put('/:id', authenticate as any, update as any)
router.patch('/:id/submit', authenticate as any, submit as any)
router.patch('/:id/approve', authenticate as any, requireAdmin as any, approve as any)
router.delete('/:id', authenticate as any, remove as any)

export default router

