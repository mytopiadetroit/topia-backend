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
  getAllRewardTasks,
  createRewardTask,
  updateRewardTask,
  deleteRewardTask,
  toggleTaskVisibility,
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

// Admin routes for task management
router.get(
  '/admin/tasks',
  authenticate,
  authorizationRole('admin'),
  getAllRewardTasks,
)
router.post(
  '/admin/tasks',
  authenticate,
  authorizationRole('admin'),
  createRewardTask,
)
router.put(
  '/admin/tasks/:id',
  authenticate,
  authorizationRole('admin'),
  updateRewardTask,
)
router.delete(
  '/admin/tasks/:id',
  authenticate,
  authorizationRole('admin'),
  deleteRewardTask,
)
router.patch(
  '/admin/tasks/:id/toggle-visibility',
  authenticate,
  authorizationRole('admin'),
  toggleTaskVisibility,
)

module.exports = router
