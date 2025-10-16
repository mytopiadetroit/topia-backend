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
  getTodayRegistrations,
  getTodayLogins,
  getRegistrationsByDate,
  getLoginsByDate,
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
// Admin: today's registrations with details
router.get(
  '/admin/today-registrations',
  authMiddleware.authenticate,
  authMiddleware.authorizationRole('admin'),
  getTodayRegistrations,
)
// Admin: today's logins with details
router.get(
  '/admin/today-logins',
  authMiddleware.authenticate,
  authMiddleware.authorizationRole('admin'),
  getTodayLogins,
)
// Admin: registrations by date range
router.get(
  '/admin/registrations-by-date',
  authMiddleware.authenticate,
  authMiddleware.authorizationRole('admin'),
  getRegistrationsByDate,
)
// Admin: logins by date range
router.get(
  '/admin/logins-by-date',
  authMiddleware.authenticate,
  authMiddleware.authorizationRole('admin'),
  getLoginsByDate,
)

module.exports = router
