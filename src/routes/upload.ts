import { Router } from 'express'
import { uploadImage as uploadImageCtrl, uploadDocument as uploadDocCtrl, deleteFile } from '../controllers/uploadController.js'
import { authenticate } from '../middleware/auth.js'
import { uploadImage, uploadDocument } from '../middleware/upload.js'

const router = Router()

router.use(authenticate as any)

router.post('/image', uploadImage.single('file'), uploadImageCtrl as any)
router.post('/document', uploadDocument.single('file'), uploadDocCtrl as any)
router.delete('/', deleteFile as any)

export default router
