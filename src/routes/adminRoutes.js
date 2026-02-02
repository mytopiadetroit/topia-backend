const express = require('express')
const router = express.Router()
const {
  authenticate,
  authorizationRole,
} = require('../middlewares/authMiddleware')
const adminController = require('../controllers/adminController')

// Admin profile routes
router.get(
  '/profile',
  authenticate,
  authorizationRole('admin'),
  adminController.getAdminProfile,
)
router.put(
  '/profile',
  authenticate,
  authorizationRole('admin'),
  adminController.updateAdminProfile,
)

// Export customers data
router.get(
  '/export-customers',
  authenticate,
  authorizationRole('admin'),
  adminController.exportCustomersData
)

// Product statistics
router.get(
  '/product-stats',
  authenticate,
  authorizationRole('admin'),
  adminController.getProductStats
)

module.exports = router
