const express = require('express')
const router = express.Router()
const upload = require('../middlewares/upload')
const {
  getActiveGalleryImages,
  getAllGalleryImages,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  toggleGalleryImageStatus,
} = require('../controllers/galleryController')
const {
  authenticate,
  authorizationRole,
} = require('../middlewares/authMiddleware')

// Public route - get active gallery images
router.get('/', getActiveGalleryImages)

// Admin routes
router.get(
  '/admin/all',
  authenticate,
  authorizationRole('admin'),
  getAllGalleryImages,
)
router.post(
  '/admin/upload',
  authenticate,
  authorizationRole('admin'),
  upload.single('image'),
  uploadGalleryImage,
)
router.put(
  '/admin/:id',
  authenticate,
  authorizationRole('admin'),
  upload.single('image'),
  updateGalleryImage,
)
router.delete(
  '/admin/:id',
  authenticate,
  authorizationRole('admin'),
  deleteGalleryImage,
)
router.patch(
  '/admin/:id/toggle',
  authenticate,
  authorizationRole('admin'),
  toggleGalleryImageStatus,
)

module.exports = router
