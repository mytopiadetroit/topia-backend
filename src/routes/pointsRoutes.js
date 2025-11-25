const express = require('express')
const router = express.Router()
const {
  adjustUserPoints,
  getUserPointsHistory,
  getAllPointsAdjustments,
  getMyPoints,
  getPointsStats,
} = require('../controllers/pointsController')
const {
  authenticate,
  authorizationRole,
} = require('../middlewares/authMiddleware')

// User routes
router.get('/my-points', authenticate, getMyPoints)

// Admin routes
router.post(
  '/admin/adjust/:userId',
  authenticate,
  authorizationRole('admin'),
  adjustUserPoints,
)
router.get(
  '/admin/history/:userId',
  authenticate,
  authorizationRole('admin'),
  getUserPointsHistory,
)
router.get(
  '/admin/adjustments',
  authenticate,
  authorizationRole('admin'),
  getAllPointsAdjustments,
)
router.get(
  '/admin/stats',
  authenticate,
  authorizationRole('admin'),
  getPointsStats,
)

module.exports = router
