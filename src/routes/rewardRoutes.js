const express = require('express')
const router = express.Router()
const upload = require('../middlewares/upload')
const {
  getRewardTasks,
  submitRewardClaim,
  getUserRewards,
  getUserRewardRequests,
  getAllRewardRequests,
  updateRewardStatus,
  getRewardStats,
} = require('../controllers/rewardController')
const {
  authenticate,
  authorizationRole,
} = require('../middlewares/authMiddleware')

// Public routes (require authentication)
router.get('/tasks', authenticate, getRewardTasks)
router.post(
  '/claim',
  authenticate,
  upload.fields([
    { name: 'proofImage', maxCount: 1 },
    { name: 'proofAudio', maxCount: 1 },
    { name: 'proofVideo', maxCount: 1 },
  ]),
  submitRewardClaim,
)
router.get('/history', authenticate, getUserRewards)
router.get('/requests', authenticate, getUserRewardRequests)

// Admin routes
router.get(
  '/admin/requests',
  authenticate,
  authorizationRole('admin'),
  getAllRewardRequests,
)
router.put(
  '/admin/requests/:id',
  authenticate,
  authorizationRole('admin'),
  updateRewardStatus,
)
router.get(
  '/admin/stats',
  authenticate,
  authorizationRole('admin'),
  getRewardStats,
)

module.exports = router
