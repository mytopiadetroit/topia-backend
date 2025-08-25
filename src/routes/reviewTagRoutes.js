const express = require('express')
const router = express.Router()
const {
  authenticate,
  authorizationRole,
} = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/reviewTagController')

// Public list endpoint for website to fetch active tags
router.get('/', ctrl.getReviewTags)

// Admin protected CRUD for tags
router.post('/', authenticate, authorizationRole('admin'), ctrl.createReviewTag)
router.get(
  '/:id',
  authenticate,
  authorizationRole('admin'),
  ctrl.getReviewTagById,
)
router.put(
  '/:id',
  authenticate,
  authorizationRole('admin'),
  ctrl.updateReviewTag,
)
router.delete(
  '/:id',
  authenticate,
  authorizationRole('admin'),
  ctrl.deleteReviewTag,
)

module.exports = router
