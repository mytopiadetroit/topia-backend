const express = require('express')
const router = express.Router()
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLoginStats,
  updateUserStatus,
  getLoginStatsRange,
} = require('../controllers/userController')
const authMiddleware = require('../middlewares/authMiddleware')

// Get all users
router.get('/', getAllUsers)

// Get user by ID
router.get('/:id', getUserById)

// Update user
router.put('/:id', updateUser)
// Update user status
router.put('/:id/status', updateUserStatus)

// Delete user
router.delete('/:id', deleteUser)

// Admin: login stats for last 7 days
router.get(
  '/admin/login-stats/last7',
  authMiddleware.authenticate,
  authMiddleware.authorizationRole('admin'),
  getLoginStats,
)
// Admin: generic stats by range
router.get(
  '/admin/login-stats',
  authMiddleware.authenticate,
  authMiddleware.authorizationRole('admin'),
  getLoginStatsRange,
)

module.exports = router
