const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const authMiddleware = require('../middlewares/authMiddleware')

// Apply authentication middleware to all order routes
router.use(authMiddleware.authenticate)

// Create new order
router.post('/orders', orderController.createOrder)

// Get order by ID
router.get('/orders/:id', orderController.getOrder)

// Get all orders for current user
router.get('/orders', orderController.getUserOrders)

// Cancel order (user can cancel their own order)
router.put('/orders/:id/cancel', orderController.cancelOrder)

// Admin routes (protected by role)
router.get(
  '/admin/orders',
  authMiddleware.authorizationRole('admin'),
  orderController.getAllOrders,
)
router.put(
  '/admin/orders/:id/status',
  authMiddleware.authorizationRole('admin'),
  orderController.updateOrderStatus,
)
// Archive order (soft delete)
router.put(
  '/admin/orders/:id/archive',
  authMiddleware.authorizationRole('admin'),
  orderController.archiveOrder,
)

// Unarchive order
router.put(
  '/admin/orders/:id/unarchive',
  authMiddleware.authorizationRole('admin'),
  orderController.unarchiveOrder,
)

// Get archived orders
router.get(
  '/admin/orders/archived/all',
  authMiddleware.authorizationRole('admin'),
  orderController.getArchivedOrders,
)

module.exports = router
