const express = require('express')
const router = express.Router()
const upload = require('../middlewares/upload')
const {

  uploadsettingImage,
  updatesettingImage,
  deletesettingImage,
  getAllsettingImages,
} = require('../controllers/settingController')
const {
  authenticate,
  authorizationRole,
} = require('../middlewares/authMiddleware')

// Public route - get active gallery images
// router.get('/', getActiveGalleryImages)

// Admin routes
router.get(
  '/admin/pageimage/all',
  getAllsettingImages,
)
router.get('/pagesetting', getAllsettingImages)
router.post(
  '/admin/pageimage/upload',
  authenticate,
  authorizationRole('admin'),
  upload.single('image'),
  uploadsettingImage,
)
router.put(
  '/admin/pageimage/:id',
  authenticate,
  authorizationRole('admin'),
  upload.single('image'),
  updatesettingImage,
)
router.delete(
  '/admin/pageimage/:id',
  authenticate,
  authorizationRole('admin'),
  deletesettingImage,
)
// router.patch(
//   '/admin/:id/toggle',
//   authenticate,
//   authorizationRole('admin'),
//   toggleGalleryImageStatus,
// )

module.exports = router
