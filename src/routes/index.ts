import { Router } from 'express'
import authRoutes from './auth.js'
import kegiatanRoutes from './kegiatan.js'
import beritaAcaraRoutes from './beritaAcara.js'
import uploadRoutes from './upload.js'
import galeriRoutes from './galeri.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/kegiatan', kegiatanRoutes)
router.use('/berita-acara', beritaAcaraRoutes)
router.use('/upload', uploadRoutes)
router.use('/galeri', galeriRoutes)

export default router
