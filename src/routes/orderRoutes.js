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
router.delete(
  '/admin/orders/:id',
  authMiddleware.authorizationRole('admin'),
  orderController.deleteOrder,
)

module.exports = router
