import { Router } from 'express'
import { login, refresh, getMe, changePassword, getAllMembers } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Public
router.post('/login', login as any)
router.post('/refresh', refresh as any)

// Protected
router.get('/me', authenticate as any, getMe as any)
router.get('/members', authenticate as any, getAllMembers as any)
router.put('/change-password', authenticate as any, changePassword as any)

export default router
