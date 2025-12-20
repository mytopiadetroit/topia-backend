const express = require('express')
const router = express.Router()
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware')
const {
  getReturningCustomers,
  getSalesComparison,
  getTopSellingProducts,
  getRevenueAnalytics,
  getCustomerGrowth
} = require('../controllers/analyticsController')

// All analytics routes require admin authentication
router.use(authenticate)
router.use(authorizationRole('admin'))

// Analytics endpoints
router.get('/returning-customers', getReturningCustomers)
router.get('/sales-comparison', getSalesComparison)
router.get('/top-selling-products', getTopSellingProducts)
router.get('/revenue', getRevenueAnalytics)
router.get('/customer-growth', getCustomerGrowth)

module.exports = router
