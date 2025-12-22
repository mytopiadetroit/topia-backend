const express = require('express')
const router = express.Router()
const {
  getAllContent,
  getPublishedContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  getContentCategories,
  getContentStats,
  addViewPublic,
  likeContent,
  unlikeContent,
} = require('../controllers/contentController')
const upload = require('../middlewares/upload')
const { authenticate } = require('../middlewares/authMiddleware')

// const auth = require('../middlewares/authMiddleware');

// Public routes (for website)
router.get('/public', getPublishedContent)
router.get('/public/:id', getContentById)
router.post('/public/:id/view', addViewPublic)
router.post('/public/:id/like', authenticate, likeContent)
router.post('/public/:id/unlike', authenticate, unlikeContent)
router.get('/categories', getContentCategories)

// Admin routes (with authentication)
router.get('/admin', authenticate, getAllContent)
router.get('/admin/stats', authenticate, getContentStats)
router.get('/admin/:id', authenticate, getContentById)

router.post(
  '/admin',
  authenticate,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'featuredVideo', maxCount: 1 },
    { name: 'videoThumbnail', maxCount: 1 },
  ]),
  createContent,
)

router.put(
  '/admin/:id',
  authenticate,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'featuredVideo', maxCount: 1 },
    { name: 'videoThumbnail', maxCount: 1 },
  ]),
  updateContent,
)

router.delete('/admin/:id', authenticate, deleteContent)

module.exports = router
